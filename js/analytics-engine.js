/**
 * Analytics Engine Component
 * Handles trade enrichment, filtering, and aggregation calculations
 */
class AnalyticsEngine {
  /**
   * Calculate computed fields for a trade record
   * @param {Object} trade - Raw trade record from CSV
   * @returns {Object} - Trade with computed fields added
   */
  enrichTrade(trade) {
    const enriched = { ...trade };

    // Parse dates safely
    const entryDate = this._parseDate(trade.Entry);
    const expiryDate = this._parseDate(trade.Expiry);
    const exitDate = trade.Exit ? this._parseDate(trade.Exit) : null;

    // Calculate Days to Expire at Entry (Requirement 2.1)
    if (entryDate && expiryDate) {
      enriched.DaysToExpireAtEntry = this._daysBetween(entryDate, expiryDate);
    } else {
      enriched.DaysToExpireAtEntry = null;
    }

    // Calculate P/L (Requirement 2.2)
    const credit = parseFloat(trade.Credit) || 0;
    const debit = parseFloat(trade.Debit) || 0;
    enriched.ProfitLoss = credit - debit;

    // Calculate Premium Percentage (Requirement 2.3)
    if (credit > 0) {
      enriched.PremiumPercentage = (enriched.ProfitLoss / credit) * 100;
    } else {
      enriched.PremiumPercentage = null;
    }

    // Calculate Days Held (Requirement 2.4)
    if (exitDate && entryDate) {
      enriched.DaysHeld = this._daysBetween(entryDate, exitDate);
    } else {
      enriched.DaysHeld = null;
    }

    // Calculate Remaining DTE (Requirement 2.5)
    if (exitDate && expiryDate) {
      enriched.RemainingDTE = this._daysBetween(exitDate, expiryDate);
    } else {
      enriched.RemainingDTE = null;
    }

    // Determine Result (Requirements 2.6, 2.7, 2.8)
    if (exitDate) {
      enriched.Result = enriched.ProfitLoss > 0 ? 'Win' : 'Loss';
    } else {
      enriched.Result = 'Open';
    }

    return enriched;
  }

  /**
   * Parse date string safely
   * @param {string} dateStr - Date string to parse
   * @returns {Date|null} - Parsed date or null if invalid
   * @private
   */
  _parseDate(dateStr) {
    if (!dateStr) return null;
    
    const date = new Date(dateStr);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: ${dateStr}`);
      return null;
    }
    
    return date;
  }

  /**
   * Calculate days between two dates
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {number} - Number of days between dates
   * @private
   */
  _daysBetween(startDate, endDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.round(diffMs / msPerDay);
  }

  /**
   * Filter trades by date range
   * @param {Array} trades - Array of enriched trade records
   * @param {string} rangeType - Date range type: 'last7days', 'last30days', 'last12months', 'ytd', 'alltime'
   * @returns {Array} - Filtered trades
   */
  filterByDateRange(trades, rangeType) {
    if (rangeType === 'alltime') {
      return trades;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    let startDate;

    switch (rangeType) {
      case 'last7days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      
      case 'last30days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      
      case 'last12months':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 12);
        break;
      
      case 'ytd':
        startDate = new Date(today.getFullYear(), 0, 1); // January 1st of current year
        break;
      
      default:
        console.warn(`Unknown date range type: ${rangeType}`);
        return trades;
    }

    startDate.setHours(0, 0, 0, 0); // Start of day

    return trades.filter(trade => {
      // For closed trades, use Exit date (Requirement 8.2)
      if (trade.Exit) {
        const exitDate = this._parseDate(trade.Exit);
        if (!exitDate) return false;
        return exitDate >= startDate && exitDate <= today;
      }
      
      // For open trades, use Entry date (Requirement 8.5)
      const entryDate = this._parseDate(trade.Entry);
      if (!entryDate) return false;
      return entryDate >= startDate && entryDate <= today;
    });
  }

  /**
   * Filter trades by position status
   * @param {Array} trades - Array of enriched trade records
   * @param {string} status - Position status: 'open', 'closed', or 'all'
   * @returns {Array} - Filtered trades
   */
  filterByStatus(trades, status) {
    if (status === 'all') {
      return trades;
    }

    if (status === 'closed') {
      // Return trades with Result = 'Win' or 'Loss' (Requirement 9.3)
      return trades.filter(trade => trade.Result === 'Win' || trade.Result === 'Loss');
    }

    if (status === 'open') {
      // Return trades with Result = 'Open' (Requirement 9.4)
      return trades.filter(trade => trade.Result === 'Open');
    }

    console.warn(`Unknown status filter: ${status}`);
    return trades;
  }

  /**
   * Calculate monthly P/L with cumulative totals
   * @param {Array} trades - Array of enriched trade records
   * @returns {Array} - Array of {month, monthLabel, pl, cumulativePL} objects
   */
  calculateMonthlyPL(trades) {
    const monthlyMap = new Map();

    // Group trades by month (Requirement 4.4)
    trades.forEach(trade => {
      // Only include closed trades
      if (trade.Result === 'Open') return;

      const exitDate = this._parseDate(trade.Exit);
      if (!exitDate) return;

      // Format as YYYY-MM
      const monthKey = `${exitDate.getFullYear()}-${String(exitDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, 0);
      }
      
      monthlyMap.set(monthKey, monthlyMap.get(monthKey) + trade.ProfitLoss);
    });

    // Convert to array and sort by month
    const monthlyArray = Array.from(monthlyMap.entries())
      .map(([month, pl]) => ({
        month,
        monthLabel: this._formatMonthLabel(month),
        pl
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate cumulative P/L
    let cumulative = 0;
    monthlyArray.forEach(item => {
      cumulative += item.pl;
      item.cumulativePL = cumulative;
    });

    return monthlyArray;
  }

  /**
   * Calculate win rate metrics by strategy
   * @param {Array} trades - Array of enriched trade records
   * @returns {Array} - Array of strategy win rate objects
   */
  calculateWinRateByStrategy(trades) {
    const strategyMap = new Map();

    // Group trades by strategy (Requirements 5.2, 5.3, 5.4)
    trades.forEach(trade => {
      // Only include closed trades (Requirement 5.5)
      if (trade.Result === 'Open') return;

      const strategy = trade.Strategy;
      
      if (!strategyMap.has(strategy)) {
        strategyMap.set(strategy, {
          strategy,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          totalWinAmount: 0,
          totalLossAmount: 0
        });
      }

      const stats = strategyMap.get(strategy);
      stats.totalTrades++;

      if (trade.Result === 'Win') {
        stats.wins++;
        stats.totalWinAmount += trade.ProfitLoss;
      } else {
        stats.losses++;
        stats.totalLossAmount += trade.ProfitLoss;
      }
    });

    // Calculate win rate percentages and net P/L
    return Array.from(strategyMap.values()).map(stats => ({
      ...stats,
      winRate: stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0,
      netPL: stats.totalWinAmount + stats.totalLossAmount
    }));
  }

  /**
   * Calculate P/L breakdown by flexible dimensions
   * @param {Array} trades - Array of enriched trade records
   * @param {Array} dimensions - Array of field names to group by (e.g., ['Symbol'], ['Type', 'Strategy'])
   * @returns {Array} - Array of grouped P/L objects
   */
  calculatePLBreakdown(trades, dimensions) {
    const breakdownMap = new Map();

    // Group trades by specified dimensions (Requirements 6.2, 7.1, 7.2, 7.3)
    trades.forEach(trade => {
      // Only include closed trades
      if (trade.Result === 'Open') return;

      // Create composite key from dimensions
      const keyParts = dimensions.map(dim => trade[dim] || 'Unknown');
      const key = keyParts.join('|');

      if (!breakdownMap.has(key)) {
        const dimensionValues = {};
        dimensions.forEach((dim, index) => {
          dimensionValues[dim] = keyParts[index];
        });

        breakdownMap.set(key, {
          dimensions: dimensionValues,
          pl: 0,
          tradeCount: 0
        });
      }

      const group = breakdownMap.get(key);
      group.pl += trade.ProfitLoss;
      group.tradeCount++;
    });

    // Convert to array and sort by P/L descending
    return Array.from(breakdownMap.values())
      .sort((a, b) => b.pl - a.pl);
  }

  /**
   * Calculate summary metrics
   * @param {Array} trades - Array of enriched trade records
   * @returns {Object} - Object with totalTrades, winRate, totalPL, averageWin
   */
  calculateSummaryMetrics(trades) {
    // Filter to closed trades only
    const closedTrades = trades.filter(trade => trade.Result === 'Win' || trade.Result === 'Loss');
    
    // Calculate total trades (Requirement 13.2)
    const totalTrades = closedTrades.length;
    
    // Calculate wins and losses
    const wins = closedTrades.filter(trade => trade.Result === 'Win');
    const winCount = wins.length;
    
    // Calculate win rate (Requirement 13.3)
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    
    // Calculate total P/L (Requirement 13.4)
    const totalPL = closedTrades.reduce((sum, trade) => sum + trade.ProfitLoss, 0);
    
    // Calculate average win (Requirement 13.5)
    const totalWinAmount = wins.reduce((sum, trade) => sum + trade.ProfitLoss, 0);
    const averageWin = winCount > 0 ? totalWinAmount / winCount : 0;
    
    return {
      totalTrades,
      winRate,
      totalPL,
      averageWin
    };
  }

  /**
   * Calculate win/loss distribution
   * @param {Array} trades - Array of enriched trade records
   * @returns {Object} - Object with {wins, losses, winPercentage, lossPercentage}
   */
  calculateWinLossDistribution(trades) {
    // Filter to closed trades only (Requirement 14.8)
    const closedTrades = trades.filter(trade => trade.Result === 'Win' || trade.Result === 'Loss');
    
    // Calculate win and loss counts (Requirements 14.2, 14.3)
    const wins = closedTrades.filter(trade => trade.Result === 'Win').length;
    const losses = closedTrades.filter(trade => trade.Result === 'Loss').length;
    const total = closedTrades.length;
    
    // Calculate percentages
    const winPercentage = total > 0 ? (wins / total) * 100 : 0;
    const lossPercentage = total > 0 ? (losses / total) * 100 : 0;
    
    return {
      wins,
      losses,
      winPercentage,
      lossPercentage
    };
  }

  /**
   * Calculate top underlyings by winning dollars
   * @param {Array} trades - Array of enriched trade records
   * @param {number} limit - Number of top symbols to return (default 5)
   * @returns {Array} - Array of {symbol, winningDollars, winCount} objects
   */
  calculateTopUnderlyings(trades, limit = 5) {
    const symbolMap = new Map();
    
    // Group winning trades by symbol (Requirement 15.2)
    trades.forEach(trade => {
      // Only include winning trades
      if (trade.Result !== 'Win') return;
      
      const symbol = trade.Symbol;
      
      if (!symbolMap.has(symbol)) {
        symbolMap.set(symbol, {
          symbol,
          winningDollars: 0,
          winCount: 0
        });
      }
      
      const stats = symbolMap.get(symbol);
      stats.winningDollars += trade.ProfitLoss;
      stats.winCount++;
    });
    
    // Convert to array, sort by winning dollars descending, and take top N (Requirement 15.3)
    return Array.from(symbolMap.values())
      .sort((a, b) => b.winningDollars - a.winningDollars)
      .slice(0, limit);
  }

  /**
   * Format month key to display label
   * @param {string} monthKey - Month in YYYY-MM format
   * @returns {string} - Formatted month label (e.g., "Jan 2024")
   * @private
   */
  _formatMonthLabel(monthKey) {
    const [year, month] = monthKey.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsEngine;
}
