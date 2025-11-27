/**
 * Broker Adapters
 * Handles different CSV formats from various brokers
 * Converts broker-specific formats to our internal trade structure
 */

class BrokerAdapter {
  /**
   * Detect which broker format the CSV is using
   * @param {Array} headers - CSV header row
   * @param {Array} firstRow - First data row
   * @returns {string} - Broker name: 'robinhood', 'tasty', 'generic'
   */
  static detectBroker(headers, firstRow) {
    const headerStr = headers.join(',').toLowerCase();    
    
    // Robinhood detection
    if (headerStr.includes('activity date') && 
        headerStr.includes('trans code') && 
        headerStr.includes('instrument')) {
      return 'robinhood';
    }
    
    // TastyTrade detection
    // Look for distinctive TastyTrade columns
    if (headerStr.includes('sub type') && 
        headerStr.includes('underlying symbol') && 
        headerStr.includes('call or put')) {
      return 'tasty';
    }
    
    // Alternative TastyTrade detection (older format)
    if (headerStr.includes('action') && 
        headerStr.includes('instrument type') && 
        headerStr.includes('expiration date')) {
      return 'tasty';
    }
    
    // Generic format (our expected format)
    if (headerStr.includes('symbol') && 
        headerStr.includes('entry') && 
        (headerStr.includes('credit') || headerStr.includes('debit'))) {
      return 'generic';
    }
    
    return 'generic';
  }

  /**
   * Get appropriate adapter for broker
   * @param {string} broker - Broker name
   * @returns {Object} - Adapter instance
   */
  static getAdapter(broker) {
    switch (broker) {
      case 'robinhood':
        return new RobinhoodAdapter();
      case 'tasty':
        return new TastyAdapter();
      default:
        return new GenericAdapter();
    }
  }
}

/**
 * Generic Adapter - handles our standard format
 */
class GenericAdapter {
  /**
   * Convert generic CSV rows to internal trade format
   * @param {Array} rows - Array of CSV row objects
   * @returns {Array} - Array of trade objects
   */
  convert(rows) {
    // Already in our format, just return as-is
    return rows;
  }
}

/**
 * Robinhood Adapter
 * Converts Robinhood transaction-level data to trade-level data
 * Simple approach: Group by Description and sum amounts
 */
class RobinhoodAdapter {
  /**
   * Parse Robinhood description to extract option details
   * Format: "SYMBOL MM/DD/YYYY Type $Strike"
   * Example: "QQQ 4/11/2025 Call $460.00"
   */
  parseDescription(description) {
    if (!description) return null;
    
    const parts = description.trim().split(' ');
    if (parts.length < 4) return null;
    
    const symbol = parts[0];
    const dateStr = parts[1];
    const type = parts[2]; // Call or Put
    const strikeStr = parts[3];
    
    // Parse expiry date
    const expiry = this._parseDate(dateStr);
    
    // Parse strike (remove $ and commas)
    const strike = parseFloat(strikeStr.replace(/[$,]/g, ''));
    
    return {
      symbol,
      expiry,
      type,
      strike
    };
  }

  /**
   * Parse Robinhood date format (M/D/YYYY)
   */
  _parseDate(dateStr) {
    if (!dateStr) return null;
    
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    return null;
  }

  /**
   * Parse amount string (handles $ and parentheses for negative)
   * Example: "$42.94" -> 42.94, "($70.04)" -> -70.04
   */
  _parseAmount(amountStr) {
    if (!amountStr) return 0;
    
    let cleaned = amountStr.replace(/[$,]/g, '');
    
    if (cleaned.includes('(') || cleaned.includes(')')) {
      cleaned = cleaned.replace(/[()]/g, '');
      return -parseFloat(cleaned);
    }
    
    return parseFloat(cleaned);
  }

  /**
   * Determine if a transaction is an opening trade
   */
  _isOpenTrade(transCode) {
    return transCode === 'STO' || transCode === 'BTO';
  }

  /**
   * Determine if a transaction is a closing trade
   */
  _isCloseTrade(transCode) {
    return transCode === 'STC' || transCode === 'BTC' || transCode === 'OEXP';
  }

  /**
   * Infer strategy from a group of opening legs on the same date and instrument
   */
  _inferStrategy(legs) {
    if (legs.length === 0) return 'Custom';
    if (legs.length === 1) {
      const leg = legs[0];
      // Single leg strategies
      if (leg.transCode === 'STO' && leg.type === 'Put') return 'Short Put';
      if (leg.transCode === 'BTO' && leg.type === 'Call') return 'Long Call';
      if (leg.transCode === 'BTO' && leg.type === 'Put') return 'Short Put'; // Buy Put is bearish
      if (leg.transCode === 'STO' && leg.type === 'Call') return 'Short Call';
      return 'Long Option';
    }

    // Multi-leg strategies
    const puts = legs.filter(l => l.type === 'Put');
    const calls = legs.filter(l => l.type === 'Call');
    const sellPuts = puts.filter(l => l.transCode === 'STO');
    const buyPuts = puts.filter(l => l.transCode === 'BTO');
    const sellCalls = calls.filter(l => l.transCode === 'STO');
    const buyCalls = calls.filter(l => l.transCode === 'BTO');

    // Strangle: Sell Put AND Sell Call
    if (sellPuts.length === 1 && sellCalls.length === 1 && legs.length === 2) {
      return 'Strangle';
    }

    // Straddle: Buy Put AND Buy Call
    if (buyPuts.length === 1 && buyCalls.length === 1 && legs.length === 2) {
      return 'Straddle';
    }

    // Put Credit Spread: Sell Put AND Buy Put (same expiry)
    if (sellPuts.length === 1 && buyPuts.length === 1 && legs.length === 2) {
      const expiry1 = sellPuts[0].expiry;
      const expiry2 = buyPuts[0].expiry;
      if (expiry1 && expiry2 && expiry1.getTime() === expiry2.getTime()) {
        return 'Put Credit Spread';
      }
    }

    // Call Credit Spread: Sell Call AND Buy Call (same expiry)
    if (sellCalls.length === 1 && buyCalls.length === 1 && legs.length === 2) {
      const expiry1 = sellCalls[0].expiry;
      const expiry2 = buyCalls[0].expiry;
      if (expiry1 && expiry2 && expiry1.getTime() === expiry2.getTime()) {
        return 'Call Credit Spread';
      }
    }

    // Iron Condor: Sell Put, Buy Put, Sell Call, Buy Call
    if (sellPuts.length === 1 && buyPuts.length === 1 && 
        sellCalls.length === 1 && buyCalls.length === 1 && legs.length === 4) {
      return 'Iron Condor';
    }

    return 'Custom';
  }

  /**
   * Group Robinhood transactions into complete trades with proper strategy inference
   */
  groupTransactions(rows) {
    const trades = [];
    
    // Filter out non-trading transactions
    const excludedDescriptions = [
      'ACH Deposit',
      'ACH Withdrawal',
      'Cash reward',
      'Interest Payment',
      'Gold Deposit Boost Payment',
      'Gold Plan Credit',
      'Gold Subscription Fee',
      'Option Expiration' // OEXP transactions
    ];
    
    const tradingRows = rows.filter(row => {
      const desc = row['Description'] || '';
      // Exclude non-trading transactions
      if (excludedDescriptions.some(excluded => desc.includes(excluded))) {
        return false;
      }
      // Must have an instrument (symbol)
      if (!row.Instrument) {
        return false;
      }
      return true;
    });
    
    console.log(`Filtered ${rows.length} rows to ${tradingRows.length} trading rows`);
    
    // Step 1: Parse all rows and separate opens from closes
    const openTrades = [];
    const closeTrades = [];
    
    tradingRows.forEach(row => {
      const transCode = row['Trans Code'];
      const details = this.parseDescription(row['Description']);
      if (!details) return;
      
      const parsedRow = {
        ...row,
        transCode,
        instrument: row['Instrument'],
        activityDate: this._parseDate(row['Activity Date']),
        amount: this._parseAmount(row['Amount']),
        quantity: Math.abs(parseInt(row['Quantity']) || 1),
        ...details
      };
      
      if (this._isOpenTrade(transCode)) {
        openTrades.push(parsedRow);
      } else if (this._isCloseTrade(transCode)) {
        closeTrades.push(parsedRow);
      }
    });
    
    // Step 2: Group open trades by Instrument and Activity Date
    const openTradeGroups = new Map();
    openTrades.forEach(trade => {
      const dateKey = trade.activityDate ? trade.activityDate.toISOString().split('T')[0] : 'unknown';
      const key = `${trade.instrument}_${dateKey}`;
      
      if (!openTradeGroups.has(key)) {
        openTradeGroups.set(key, []);
      }
      openTradeGroups.get(key).push(trade);
    });
    
    // Step 3: Infer strategy for each group of open trades
    const strategyMap = new Map(); // Maps description -> strategy
    
    openTradeGroups.forEach((legs, groupKey) => {
      const strategy = this._inferStrategy(legs);
      
      // Assign this strategy to all legs in the group
      legs.forEach(leg => {
        strategyMap.set(leg.Description, strategy);
      });
    });
    
    // Step 4: Build trades from individual legs
    // Group by Description to aggregate all transactions for each option
    const byDescription = new Map();
    tradingRows.forEach(row => {
      const desc = row['Description'];
      if (!byDescription.has(desc)) {
        byDescription.set(desc, []);
      }
      byDescription.get(desc).push(row);
    });
    
    // Process each unique option
    byDescription.forEach((transRows, description) => {
      const details = this.parseDescription(description);
      if (!details) {
        console.warn('Could not parse option details from:', description);
        return;
      }
      
      // Sum all amounts for this option
      let totalAmount = 0;
      let earliestDate = null;
      let latestDate = null;
      let hasOpen = false;
      let hasClose = false;
      
      transRows.forEach(row => {
        const transCode = row['Trans Code'];
        const amount = this._parseAmount(row['Amount']);
        const activityDate = this._parseDate(row['Activity Date']);
        
        totalAmount += amount;
        
        // Track dates
        if (!earliestDate || activityDate < earliestDate) {
          earliestDate = activityDate;
        }
        if (!latestDate || activityDate > latestDate) {
          latestDate = activityDate;
        }
        
        // Track if we have opens and closes
        if (this._isOpenTrade(transCode)) {
          hasOpen = true;
        }
        if (this._isCloseTrade(transCode)) {
          hasClose = true;
        }
      });
      
      // Determine if position is closed or open
      const isClosed = hasOpen && hasClose;
      
      // Determine credit and debit based on the sign of totalAmount
      let credit = 0;
      let debit = 0;
      
      if (totalAmount > 0) {
        credit = totalAmount;
      } else {
        debit = Math.abs(totalAmount);
      }
      
      // Get strategy from strategyMap (inferred from open trades)
      let strategy = strategyMap.get(description) || 'Custom';
      
      // Get average quantity
      const totalQty = transRows.reduce((sum, row) => {
        return sum + Math.abs(parseInt(row['Quantity']) || 1);
      }, 0);
      const avgQty = Math.floor(totalQty / transRows.length);
      
      const trade = {
        Symbol: details.symbol,
        Type: details.type,
        Strategy: strategy,
        Strike: details.strike,
        Expiry: details.expiry,
        Volume: avgQty,
        Entry: earliestDate,
        Delta: 0, // Not provided by Robinhood
        Exit: isClosed ? latestDate : null,
        Debit: debit,
        Credit: credit,
        Account: 'Robinhood'
      };
      
      trades.push(trade);
    });
    
    return trades;
  }

  /**
   * Convert Robinhood CSV to internal format
   */
  convert(rows) {
    console.log('=== Robinhood Adapter Processing ===');
    console.log('Total CSV rows:', rows.length);
    
    // Log transaction types for debugging
    const transTypes = new Map();
    rows.forEach(row => {
      const code = row['Trans Code'] || 'UNKNOWN';
      transTypes.set(code, (transTypes.get(code) || 0) + 1);
    });
    console.log('Transaction types found:', Object.fromEntries(transTypes));
    
    const trades = this.groupTransactions(rows);
    console.log('\n=== Results ===');
    console.log('Total trades created:', trades.length);
    
    const closedTrades = trades.filter(t => t.Exit !== null);
    const openTrades = trades.filter(t => t.Exit === null);
    
    console.log('  - Closed trades:', closedTrades.length);
    console.log('  - Open trades:', openTrades.length);
    
    // Calculate total P/L for verification
    const totalPL = closedTrades.reduce((sum, t) => sum + (t.Credit - t.Debit), 0);
    console.log('\n=== P/L Summary ===');
    console.log('Total P/L from closed trades: $' + totalPL.toFixed(2));
    
    if (trades.length > 0) {
      console.log('\nSample trade:', trades[0]);
    }
    
    console.log('=================================\n');
    return trades;
  }
}

/**
 * Tasty Adapter
 * Converts TastyTrade CSV to internal trade format
 * Uses advanced strategy inference logic from tastyAdapter.js
 */
class TastyAdapter {
  /**
   * Convert TastyTrade CSV to internal format
   * Uses strategy inference logic to properly identify multi-leg strategies
   */
  convert(rows) {
    // Check if the strategy mapper is available (loaded via script tag)
    if (typeof TastyStrategyMapper !== 'undefined' && TastyStrategyMapper.convertTastyWithStrategyInference) {
      return TastyStrategyMapper.convertTastyWithStrategyInference(rows);
    }
    
    // Fallback: if mapper not available, return empty array with warning
    console.error('TastyStrategyMapper not loaded. Please ensure tasty-strategy-mapper.js is included before broker-adapters.js');
    return [];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BrokerAdapter, RobinhoodAdapter, TastyAdapter, GenericAdapter };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
  window.BrokerAdapter = BrokerAdapter;
  window.RobinhoodAdapter = RobinhoodAdapter;
  window.TastyAdapter = TastyAdapter;
  window.GenericAdapter = GenericAdapter;
}
