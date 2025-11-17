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
   * Simple approach: Group by Description (each unique option) and sum amounts
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
      'Gold Subscription Fee'
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
    
    // Group by Instrument, then by Description
    const byInstrument = new Map();
    tradingRows.forEach(row => {
      const instrument = row['Instrument'];
      if (!byInstrument.has(instrument)) {
        byInstrument.set(instrument, new Map());
      }
      
      const desc = row['Description'];
      const byDesc = byInstrument.get(instrument);
      
      if (!byDesc.has(desc)) {
        byDesc.set(desc, []);
      }
      byDesc.get(desc).push(row);
    });
    
    // Process each unique option (Description) as a single trade
    byInstrument.forEach((byDesc, instrument) => {
      byDesc.forEach((rows, description) => {
        // Parse option details from description
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
        
        rows.forEach(row => {
      const details = this.parseDescription(row.Description);
      if (!details) {
        console.warn('Could not parse option details from:', row.Description);
        return;
      }
      
      const transCode = row['Trans Code'];
      const quantity = Math.abs(parseInt(row.Quantity) || 1);
      const amount = this._parseAmount(row.Amount);
      const activityDate = this._parseDate(row['Activity Date']);
      
      // Validate amount is reasonable for an option trade
      // Options premiums are typically < $10,000 per contract
      if (Math.abs(amount) > 10000) {
        console.warn('Suspicious amount detected (possibly not an option trade):', amount, row.Description);
      }
      
      // Create position key
      const posKey = `${details.symbol}_${details.strike}_${details.type}_${details.expiry?.getTime()}`;
      
      // Opening transaction - add to open positions
      if (transCode === 'STO' || transCode === 'BTO') {
        if (!openPositions.has(posKey)) {
          openPositions.set(posKey, []);
        }
        
        // Add to end of array (will be matched FIFO - first in, first out)
        openPositions.get(posKey).push({
          openDate: activityDate,
          openAmount: amount,
          openAction: transCode,
          quantity: quantity,
          details: details
        });
      }
      
      // Closing transaction - match with oldest open (FIFO)
      // This is standard accounting practice for options
      if (transCode === 'STC' || transCode === 'BTC') {
        const positions = openPositions.get(posKey);
        
        // Try to match with available open positions (LIFO - most recent first)
        let remainingToClose = quantity;
        let matched = false;
        let tradesCreated = 0;
        
        while (remainingToClose > 0 && positions && positions.length > 0) {
          matched = true;
          const openPos = positions[0]; // Peek at OLDEST position (FIFO)
          
          // Determine how many contracts to close from this position
          const contractsToClose = Math.min(remainingToClose, openPos.quantity);
          
          // Log quantity splitting if applicable
          if (quantity > openPos.quantity || tradesCreated > 0) {
            console.log(`Quantity split: Closing ${contractsToClose} of ${quantity} contracts from position with ${openPos.quantity} contracts`);
          }
          
          // Calculate proportional amounts based on contracts being closed
          const openAmountPerContract = openPos.openAmount / openPos.quantity;
          const closeAmountPerContract = amount / quantity;
          
          const proportionalOpenAmount = openAmountPerContract * contractsToClose;
          const proportionalCloseAmount = closeAmountPerContract * contractsToClose;
          
          // Create completed trade
          // For STO (sell to open): we receive credit when opening, pay debit when closing (BTC)
          // For BTO (buy to open): we pay debit when opening, receive credit when closing (STC)
          let credit = 0;
          let debit = 0;
          
          if (openPos.openAction === 'STO') {
            // Short option: credit on open, debit on close
            credit = Math.abs(proportionalOpenAmount);
            debit = Math.abs(proportionalCloseAmount);
          } else if (openPos.openAction === 'BTO') {
            // Long option: debit on open, credit on close
            debit = Math.abs(proportionalOpenAmount);
            credit = Math.abs(proportionalCloseAmount);
          }
          
          const trade = {
            Symbol: details.symbol,
            Type: details.type,
            Strategy: this._detectStrategy(openPos.openAction, transCode),
            Strike: details.strike,
            Expiry: details.expiry,
            Volume: contractsToClose,
            Entry: openPos.openDate,
            Delta: 0, // Not provided by Robinhood
            Exit: activityDate,
            Debit: debit,
            Credit: credit,
            Account: 'Robinhood'
          };
          
          trades.push(trade);
          tradesCreated++;
          
          // Update remaining quantities
          remainingToClose -= contractsToClose;
          openPos.quantity -= contractsToClose;
          
          // Remove position if fully closed (from beginning of array - FIFO)
          if (openPos.quantity <= 0) {
            positions.shift();
          }
          
          // Remove key if no more open positions
          if (positions.length === 0) {
            openPositions.delete(posKey);
          }
        }
        
        // If we couldn't match all contracts, create partial trade for remainder
        if (remainingToClose > 0) {
          // Unmatched closing transaction - position was opened before CSV date range
          // Treat as a standalone closing transaction for the remaining contracts
          // STC = we received money (credit), BTC = we paid money (debit)
          
          // Calculate proportional amount for remaining contracts
          const closeAmountPerContract = amount / quantity;
          const proportionalCloseAmount = closeAmountPerContract * remainingToClose;
          
          const credit = transCode === 'STC' ? Math.abs(proportionalCloseAmount) : 0;
          const debit = transCode === 'BTC' ? Math.abs(proportionalCloseAmount) : 0;
          
          // Infer the opening action from closing action
          const inferredOpenAction = transCode === 'STC' ? 'BTO' : 'STO';
          
          trades.push({
            Symbol: details.symbol,
            Type: details.type,
            Strategy: this._detectStrategy(inferredOpenAction, transCode) + ' (Partial)',
            Strike: details.strike,
            Expiry: details.expiry,
            Volume: remainingToClose,
            Entry: activityDate, // Use close date as entry since we don't have the real entry
            Delta: 0,
            Exit: activityDate,
            Debit: debit,
            Credit: credit,
            Account: 'Robinhood',
            Note: 'Opening transaction not in CSV - P/L incomplete'
          });
          
          console.warn('Unmatched close:', transCode, details.symbol, details.strike, 
                      `(${remainingToClose} of ${quantity} contracts) - treating as partial trade`);
        }
      }
    });
    
    // Add remaining open positions as open trades
    openPositions.forEach((positions, key) => {
      positions.forEach(openPos => {
        // For open positions, only record the opening transaction
        // STO = we received credit, BTO = we paid debit
        const credit = openPos.openAction === 'STO' ? Math.abs(openPos.openAmount) : 0;
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
    
    // Calculate total contracts
    const totalContracts = trades.reduce((sum, t) => sum + (t.Volume || 0), 0);
    console.log('Total contracts:', totalContracts);
    
    const closedTrades = trades.filter(t => t.Exit !== null);
    const openTrades = trades.filter(t => t.Exit === null);
    const partialTrades = trades.filter(t => t.Note && t.Note.includes('incomplete'));
    
    console.log('  - Closed trades (matched):', closedTrades.length - partialTrades.length);
    console.log('  - Partial trades (unmatched close):', partialTrades.length);
    console.log('  - Open trades:', openTrades.length);
    
    // Calculate total P/L for verification
    const totalPL = closedTrades.reduce((sum, t) => sum + (t.Credit - t.Debit), 0);
    console.log('\n=== P/L Summary ===');
    console.log('Total P/L from all closed trades: $' + totalPL.toFixed(2));
    
    if (partialTrades.length > 0) {
      const partialPL = partialTrades.reduce((sum, t) => sum + (t.Credit - t.Debit), 0);
      console.log('  - P/L from partial trades: $' + partialPL.toFixed(2));
      console.log('  - P/L from matched trades: $' + (totalPL - partialPL).toFixed(2));
      console.log('\nWARNING: ' + partialTrades.length + ' trades have incomplete data.');
      console.log('This happens when closing transactions are in the CSV but opening transactions are not.');
      console.log('The P/L calculation may be incomplete. Consider downloading a longer date range.');
    }
    
    if (trades.length > 0) {
      console.log('\nSample trade:', trades[0]);
    }
    
    console.log('=================================\n');
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
