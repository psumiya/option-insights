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
    
    // Tasty detection
    if (headerStr.includes('marketorfill') && 
        headerStr.includes('timestampattype') && 
        headerStr.includes('order #')) {
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
 */
class RobinhoodAdapter {
  constructor() {
    this.transactionCodes = {
      'STO': 'Sell to Open',
      'BTO': 'Buy to Open',
      'STC': 'Sell to Close',
      'BTC': 'Buy to Close'
    };
  }

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
    
    // Try standard date parsing first
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
    
    // Remove $ and commas
    let cleaned = amountStr.replace(/[$,]/g, '');
    
    // Check for parentheses (negative)
    if (cleaned.includes('(') || cleaned.includes(')')) {
      cleaned = cleaned.replace(/[()]/g, '');
      return -parseFloat(cleaned);
    }
    
    return parseFloat(cleaned);
  }

  /**
   * Group Robinhood transactions into complete trades
   * Matches opening and closing transactions
   */
  groupTransactions(rows) {
    const trades = [];
    const openPositions = new Map();
    
    // Filter out non-option transactions
    const optionRows = rows.filter(row => {
      return row.Instrument && 
             row.Description && 
             row['Trans Code'] &&
             (row['Trans Code'] === 'STO' || 
              row['Trans Code'] === 'BTO' || 
              row['Trans Code'] === 'STC' || 
              row['Trans Code'] === 'BTC');
    });
    
    // Robinhood CSV is in reverse chronological order (newest first)
    // Reverse it so we process opens before closes
    optionRows.reverse();
    
    // Process transactions in chronological order
    optionRows.forEach(row => {
      const details = this.parseDescription(row.Description);
      if (!details) return;
      
      const transCode = row['Trans Code'];
      const quantity = Math.abs(parseInt(row.Quantity) || 1);
      const amount = this._parseAmount(row.Amount);
      const activityDate = this._parseDate(row['Activity Date']);
      
      // Create position key
      const posKey = `${details.symbol}_${details.strike}_${details.type}_${details.expiry?.getTime()}`;
      
      // Opening transaction
      if (transCode === 'STO' || transCode === 'BTO') {
        if (!openPositions.has(posKey)) {
          openPositions.set(posKey, []);
        }
        
        openPositions.get(posKey).push({
          openDate: activityDate,
          openAmount: amount,
          openAction: transCode,
          quantity: quantity,
          details: details
        });
      }
      
      // Closing transaction
      if (transCode === 'STC' || transCode === 'BTC') {
        const positions = openPositions.get(posKey);
        if (positions && positions.length > 0) {
          // Match with oldest open position (FIFO)
          const openPos = positions.shift();
          
          // Create completed trade
          const credit = transCode === 'STC' ? amount : openPos.openAmount;
          const debit = transCode === 'BTC' ? Math.abs(amount) : Math.abs(openPos.openAmount);
          
          const trade = {
            Symbol: details.symbol,
            Type: details.type,
            Strategy: this._detectStrategy(openPos.openAction, transCode),
            Strike: details.strike,
            Expiry: details.expiry,
            Volume: quantity,
            Entry: openPos.openDate,
            Delta: 0, // Not provided by Robinhood
            Exit: activityDate,
            Debit: debit,
            Credit: credit,
            Account: 'Robinhood'
          };
          
          trades.push(trade);
          
          // Remove key if no more open positions
          if (positions.length === 0) {
            openPositions.delete(posKey);
          }
        } else {
          console.warn('Closing transaction without open position:', transCode, details.symbol, details.strike);
        }
      }
    });
    
    // Add remaining open positions as open trades
    openPositions.forEach((positions, key) => {
      positions.forEach(openPos => {
        const credit = openPos.openAction === 'STO' ? openPos.openAmount : 0;
        const debit = openPos.openAction === 'BTO' ? Math.abs(openPos.openAmount) : 0;
        
        trades.push({
          Symbol: openPos.details.symbol,
          Type: openPos.details.type,
          Strategy: this._detectStrategy(openPos.openAction, null),
          Strike: openPos.details.strike,
          Expiry: openPos.details.expiry,
          Volume: openPos.quantity,
          Entry: openPos.openDate,
          Delta: 0,
          Exit: null, // Still open
          Debit: debit,
          Credit: credit,
          Account: 'Robinhood'
        });
      });
    });
    
    return trades;
  }

  /**
   * Detect strategy from transaction codes
   */
  _detectStrategy(openAction, closeAction) {
    if (openAction === 'STO') {
      return closeAction === 'BTC' ? 'Short Option' : 'Short Option';
    }
    if (openAction === 'BTO') {
      return closeAction === 'STC' ? 'Long Option' : 'Long Option';
    }
    return 'Unknown';
  }

  /**
   * Convert Robinhood CSV to internal format
   */
  convert(rows) {
    console.log('Robinhood adapter: Converting', rows.length, 'rows');
    const trades = this.groupTransactions(rows);
    console.log('Robinhood adapter: Produced', trades.length, 'trades');
    
    const closedTrades = trades.filter(t => t.Exit !== null);
    const openTrades = trades.filter(t => t.Exit === null);
    console.log('  - Closed trades:', closedTrades.length);
    console.log('  - Open trades:', openTrades.length);
    
    if (trades.length > 0) {
      console.log('Sample Robinhood trade:', trades[0]);
    }
    return trades;
  }
}

/**
 * Tasty Adapter
 * Converts Tasty order-level data to trade-level data
 */
class TastyAdapter {
  /**
   * Parse Tasty description
   * Format: "quantity expiry dte strike type action"
   * Example: "-1 Nov 21 10d 210 Call STO"
   * Multi-leg: separated by newlines
   */
  parseDescription(description) {
    if (!description) return [];
    
    const legs = description.split('\n').map(leg => leg.trim()).filter(leg => leg);
    
    return legs.map(leg => {
      const parts = leg.split(' ').filter(p => p);
      if (parts.length < 6) return null;
      
      const quantity = parseInt(parts[0]);
      const month = parts[1];
      const day = parts[2];
      const dte = parts[3]; // Days to expiration (not used)
      const strike = parseFloat(parts[4]);
      const type = parts[5]; // Call or Put
      const action = parts[6]; // STO, BTO, STC, BTC
      
      // Parse expiry date
      const currentYear = new Date().getFullYear();
      const expiry = new Date(`${month} ${day}, ${currentYear}`);
      
      // If expiry is in the past, assume next year
      if (expiry < new Date()) {
        expiry.setFullYear(currentYear + 1);
      }
      
      return {
        quantity: Math.abs(quantity),
        expiry,
        strike,
        type,
        action,
        isShort: quantity < 0
      };
    }).filter(leg => leg !== null);
  }

  /**
   * Parse Tasty price format
   * Example: "1.22 cr" -> 1.22, "0.37 db" -> -0.37
   */
  _parsePrice(priceStr) {
    if (!priceStr) return 0;
    
    const parts = priceStr.trim().split(' ');
    const value = parseFloat(parts[0]);
    const type = parts[1]; // 'cr' or 'db'
    
    return type === 'db' ? -value : value;
  }

  /**
   * Parse Tasty date format
   * Example: "11/07, 8:20a"
   */
  _parseDate(dateStr) {
    if (!dateStr) return null;
    
    const parts = dateStr.split(',')[0].trim();
    const [month, day] = parts.split('/');
    const currentYear = new Date().getFullYear();
    
    return new Date(`${currentYear}-${month}-${day}`);
  }

  /**
   * Detect strategy from legs
   */
  _detectStrategy(legs) {
    if (legs.length === 1) {
      const leg = legs[0];
      if (leg.action === 'STO') return 'Short Option';
      if (leg.action === 'BTO') return 'Long Option';
      if (leg.action === 'STC') return 'Long Option';
      if (leg.action === 'BTC') return 'Short Option';
    }
    
    if (legs.length === 2) {
      const types = legs.map(l => l.type).sort().join('-');
      const strikes = legs.map(l => l.strike).sort((a, b) => a - b);
      
      if (types === 'Call-Call') {
        return strikes[0] < strikes[1] ? 'Bull Call Spread' : 'Bear Call Spread';
      }
      if (types === 'Put-Put') {
        return strikes[0] < strikes[1] ? 'Bull Put Spread' : 'Bear Put Spread';
      }
      if (types === 'Call-Put') {
        return 'Strangle';
      }
    }
    
    if (legs.length === 4) {
      return 'Iron Condor';
    }
    
    return 'Multi-Leg';
  }

  /**
   * Convert Tasty CSV to internal format
   */
  convert(rows) {
    const trades = [];
    
    rows.forEach(row => {
      if (row.Status !== 'Filled') return;
      
      const legs = this.parseDescription(row.Description);
      if (legs.length === 0) return;
      
      const fillDate = this._parseDate(row.Time);
      const fillPrice = this._parsePrice(row.MarketOrFill);
      
      // For single-leg trades
      if (legs.length === 1) {
        const leg = legs[0];
        const isOpening = leg.action === 'STO' || leg.action === 'BTO';
        const isClosing = leg.action === 'STC' || leg.action === 'BTC';
        
        const credit = fillPrice > 0 ? fillPrice * 100 : 0; // Convert to dollars
        const debit = fillPrice < 0 ? Math.abs(fillPrice) * 100 : 0;
        
        trades.push({
          Symbol: row.Symbol,
          Type: leg.type,
          Strategy: this._detectStrategy(legs),
          Strike: leg.strike,
          Expiry: leg.expiry,
          Volume: leg.quantity,
          Entry: fillDate,
          Delta: 0, // Not provided
          Exit: isClosing ? fillDate : null,
          Debit: debit,
          Credit: credit,
          Account: 'Tasty'
        });
      } else {
        // Multi-leg trade - create as single trade with primary leg
        const primaryLeg = legs[0];
        const totalCredit = fillPrice > 0 ? fillPrice * 100 : 0;
        const totalDebit = fillPrice < 0 ? Math.abs(fillPrice) * 100 : 0;
        
        trades.push({
          Symbol: row.Symbol,
          Type: primaryLeg.type,
          Strategy: this._detectStrategy(legs),
          Strike: primaryLeg.strike,
          Expiry: primaryLeg.expiry,
          Volume: primaryLeg.quantity,
          Entry: fillDate,
          Delta: 0,
          Exit: null, // Assume opening for multi-leg
          Debit: totalDebit,
          Credit: totalCredit,
          Account: 'Tasty'
        });
      }
    });
    
    return trades;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BrokerAdapter, RobinhoodAdapter, TastyAdapter, GenericAdapter };
}
