/**
 * Demo Data Generator
 * Generates realistic sample trading data for demonstration purposes
 */
class DemoDataGenerator {
  constructor() {
    // Sample symbols with realistic characteristics
    this.symbols = [
      { name: 'AAPL', volatility: 0.3 },
      { name: 'TSLA', volatility: 0.6 },
      { name: 'MSFT', volatility: 0.25 },
      { name: 'SPY', volatility: 0.2 },
      { name: 'NVDA', volatility: 0.5 },
      { name: 'AMZN', volatility: 0.35 },
      { name: 'META', volatility: 0.4 },
      { name: 'GOOGL', volatility: 0.3 },
      { name: 'AMD', volatility: 0.55 },
      { name: 'QQQ', volatility: 0.25 }
    ];

    // Option strategies with typical characteristics
    this.strategies = [
      { name: 'Long Call', winRate: 0.45, avgReturn: 0.3 },
      { name: 'Long Put', winRate: 0.40, avgReturn: 0.25 },
      { name: 'Covered Call', winRate: 0.70, avgReturn: 0.15 },
      { name: 'Cash Secured Put', winRate: 0.65, avgReturn: 0.12 },
      { name: 'Bull Call Spread', winRate: 0.55, avgReturn: 0.20 },
      { name: 'Bear Put Spread', winRate: 0.50, avgReturn: 0.18 },
      { name: 'Iron Condor', winRate: 0.60, avgReturn: 0.10 },
      { name: 'Butterfly Spread', winRate: 0.35, avgReturn: 0.40 }
    ];

    this.accounts = ['Main', 'IRA', 'Roth IRA'];
  }

  /**
   * Generate demo trades
   * @param {number} count - Number of trades to generate (default: 100)
   * @param {number} daysBack - How many days back to generate trades (default: 365)
   * @returns {Array} Array of trade objects
   */
  generate(count = 100, daysBack = 365) {
    const trades = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
      const trade = this.generateSingleTrade(today, daysBack);
      trades.push(trade);
    }

    return trades;
  }

  /**
   * Generate a single realistic trade
   * @private
   */
  generateSingleTrade(today, daysBack) {
    // Random symbol
    const symbol = this.randomChoice(this.symbols);
    
    // Random strategy
    const strategy = this.randomChoice(this.strategies);
    
    // Random entry date (within daysBack range)
    const entryDaysAgo = Math.floor(Math.random() * daysBack);
    const entryDate = new Date(today);
    entryDate.setDate(entryDate.getDate() - entryDaysAgo);
    
    // Determine if position is closed (80% closed, 20% open)
    const isClosed = Math.random() < 0.8;
    
    // Exit date (if closed) - between 1 and 60 days after entry
    let exitDate = null;
    if (isClosed) {
      const daysHeld = Math.floor(Math.random() * 60) + 1;
      exitDate = new Date(entryDate);
      exitDate.setDate(exitDate.getDate() + daysHeld);
      
      // Don't exit in the future
      if (exitDate > today) {
        exitDate = null;
      }
    }
    
    // Expiry date - typically 30-90 days from entry
    const daysToExpiry = Math.floor(Math.random() * 60) + 30;
    const expiryDate = new Date(entryDate);
    expiryDate.setDate(expiryDate.getDate() + daysToExpiry);
    
    // Option type based on strategy
    const type = this.getOptionType(strategy.name);
    
    // Strike price (realistic based on symbol)
    const strike = this.generateStrike(symbol.name);
    
    // Volume (1-5 contracts, weighted toward 1)
    const volume = Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 4) + 2;
    
    // Delta (realistic based on type)
    const delta = this.generateDelta(type);
    
    // Debit (entry cost per contract)
    const debit = this.generateDebit(strike, symbol.volatility);
    
    // Credit (exit value per contract) - only if closed
    let credit = null;
    if (exitDate) {
      // Determine win/loss based on strategy win rate
      const isWin = Math.random() < strategy.winRate;
      
      if (isWin) {
        // Winner: credit > debit
        const returnMultiplier = 1 + (Math.random() * strategy.avgReturn * 2);
        credit = debit * returnMultiplier;
      } else {
        // Loser: credit < debit
        const lossMultiplier = Math.random() * 0.8; // Lose 20-100%
        credit = debit * lossMultiplier;
      }
    }
    
    // Account
    const account = this.randomChoice(this.accounts);
    
    return {
      Symbol: symbol.name,
      Type: type,
      Strategy: strategy.name,
      Strike: strike.toFixed(2),
      Expiry: this.formatDate(expiryDate),
      Volume: volume,
      Entry: this.formatDate(entryDate),
      Delta: delta.toFixed(2),
      Exit: exitDate ? this.formatDate(exitDate) : '',
      Debit: debit.toFixed(2),
      Credit: credit ? credit.toFixed(2) : '',
      Account: account
    };
  }

  /**
   * Get option type based on strategy
   * @private
   */
  getOptionType(strategy) {
    if (strategy.includes('Call')) return 'Call';
    if (strategy.includes('Put')) return 'Put';
    if (strategy.includes('Condor') || strategy.includes('Butterfly')) {
      return Math.random() < 0.5 ? 'Call' : 'Put';
    }
    return Math.random() < 0.5 ? 'Call' : 'Put';
  }

  /**
   * Generate realistic strike price
   * @private
   */
  generateStrike(symbol) {
    const baseStrikes = {
      'AAPL': 180,
      'TSLA': 250,
      'MSFT': 380,
      'SPY': 450,
      'NVDA': 500,
      'AMZN': 150,
      'META': 350,
      'GOOGL': 140,
      'AMD': 140,
      'QQQ': 380
    };
    
    const base = baseStrikes[symbol] || 100;
    const variation = (Math.random() - 0.5) * 0.2; // ±10%
    return base * (1 + variation);
  }

  /**
   * Generate realistic delta
   * @private
   */
  generateDelta(type) {
    // Calls: positive delta (0.2 to 0.8)
    // Puts: negative delta (-0.8 to -0.2)
    const magnitude = 0.2 + Math.random() * 0.6;
    return type === 'Call' ? magnitude : -magnitude;
  }

  /**
   * Generate realistic debit (entry cost)
   * @private
   */
  generateDebit(strike, volatility) {
    // Base premium as percentage of strike
    const basePercent = 0.02 + (volatility * 0.05);
    const premium = strike * basePercent;
    
    // Add some randomness
    const variation = 0.5 + Math.random();
    return premium * variation;
  }

  /**
   * Format date as YYYY-MM-DD
   * @private
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Random choice from array
   * @private
   */
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DemoDataGenerator;
}
