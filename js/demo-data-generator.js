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
      { name: 'Butterfly', winRate: 0.35, avgReturn: 0.40 }
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

  /**
   * Generate SPX 0DTE trades as raw tastytrade transaction rows
   *
   * Each demo day replays that day's real SPX open/high/low/close (from
   * data/spx-daily.json), so move buckets, strike distances and settlement all
   * line up with the market data the 0DTE view measures against. Legs are
   * priced with a simple time-decay model, positions are managed with take
   * profit and stop rules, and everything left at the bell expires or cash
   * settles at the close. Rows follow the export's own format, quirks included,
   * so they run through the same parsing as an uploaded file.
   *
   * @param {Object} spx - { bars: [{ d, o, h, l, c }] }
   * @param {Object} [options]
   * @param {number} [options.days=40] - Trading days to trade on
   * @param {number} [options.lookback=180] - Most recent bars to choose days from
   * @param {Function} [options.random=Math.random] - RNG returning [0, 1)
   * @returns {Array<Object>} Raw rows, newest first like the export
   */
  generateSpx0dte(spx, { days = 40, lookback = 180, random = Math.random } = {}) {
    const bars = (spx && spx.bars ? spx.bars : []).slice(-lookback);
    if (!bars.length) return [];

    const rnd = (lo, hi) => lo + random() * (hi - lo);
    const pick = weighted => {
      let r = random() * weighted.reduce((s, w) => s + w[1], 0);
      for (const [value, weight] of weighted) {
        r -= weight;
        if (r < 0) return value;
      }
      return weighted[weighted.length - 1][0];
    };
    const r5 = x => Math.round(x / 5) * 5;

    const chosen = bars
      .map(bar => ({ bar, key: random() }))
      .sort((a, b) => a.key - b.key)
      .slice(0, Math.min(days, bars.length))
      .map(x => x.bar)
      .sort((a, b) => a.d.localeCompare(b.d));

    const rows = [];
    let order = 431000000 + Math.floor(random() * 100000);

    chosen.forEach(bar => {
      const path = this.spxPath(bar);
      const entries = Array.from({ length: pick([[1, 4], [2, 4], [3, 2]]) }, () => this.zeroDteEntryMinute(pick, rnd))
        .sort((a, b) => a - b);
      // A contract already held today can't be opened again on the other side,
      // and reusing one would blur which trade a close belongs to
      const used = new Set();
      entries.forEach(entry => {
        let legs = null;
        for (let attempt = 0; attempt < 8 && !legs; attempt++) {
          const candidate = this.zeroDteLegs(pick, rnd, r5, path(entry), bar);
          if (candidate && candidate.every(l => !used.has(`${l.type}${l.strike}`))) legs = candidate;
        }
        if (!legs) return;
        legs.forEach(l => used.add(`${l.type}${l.strike}`));
        rows.push(...this.zeroDteTradeRows(bar, path, entry, legs, order, pick, rnd));
        order += 1 + Math.floor(random() * 40);
      });
    });

    return rows.sort((a, b) => b.Date.localeCompare(a.Date));
  }

  /**
   * Piecewise-linear intraday SPX path through the day's bar
   * Touches the low before the high on up days and the high first on down days.
   * @private
   * @returns {Function} minute since 9:30 ET (0..390) -> price
   */
  spxPath(bar) {
    const up = bar.c >= bar.o;
    const points = [
      [0, bar.o],
      [up ? 110 : 120, up ? bar.l : bar.h],
      [up ? 290 : 280, up ? bar.h : bar.l],
      [390, bar.c]
    ];
    return minute => {
      const m = Math.max(0, Math.min(390, minute));
      for (let i = 1; i < points.length; i++) {
        const [m1, p1] = points[i];
        const [m0, p0] = points[i - 1];
        if (m <= m1) return p0 + (p1 - p0) * (m - m0) / (m1 - m0);
      }
      return bar.c;
    };
  }

  /**
   * Entry time in minutes after 9:30 ET
   * About two thirds in the first hour, a second cluster in the last 90 minutes.
   * @private
   */
  zeroDteEntryMinute(pick, rnd) {
    const window = pick([[[1, 30], 42], [[30, 60], 18], [[60, 150], 12], [[150, 300], 6], [[300, 375], 22]]);
    return Math.floor(rnd(window[0], window[1]));
  }

  /**
   * Choose a structure and its strikes around the current SPX level
   * @private
   * @returns {Array<{type: 'P'|'C', strike: number, side: 'short'|'long', qty: number}>|null}
   */
  zeroDteLegs(pick, rnd, r5, spot, bar) {
    // A trader with some read on the day: more premium selling when SPX
    // stays put, more directional debit spreads when it trends
    const move = (bar.c - bar.o) / bar.o * 100;
    const quiet = Math.abs(move) < 0.4;
    const trend = Math.abs(move) > 0.8;
    const informed = rnd(0, 1) < 0.7;
    const tilt = (name, weight) => {
      if (!informed) return [name, weight];
      if (quiet && /credit|condor|Short put/.test(name)) return [name, weight * 3];
      if (quiet && /debit|Long|Reverse/.test(name)) return [name, weight * 0.3];
      if (trend && /condor|butterfly/.test(name)) return [name, weight * 0.2];
      if (trend && name === (move < 0 ? 'Put debit spread' : 'Call debit spread')) return [name, weight * 3];
      if (trend && name === (move < 0 ? 'Call credit spread' : 'Put credit spread')) return [name, weight * 2];
      return [name, weight];
    };
    const structure = pick([
      ['Iron condor', 43], ['Put debit spread', 19], ['Put credit spread', 10],
      ['Call credit spread', 8], ['Call butterfly', 5], ['Call debit spread', 4],
      ['Put butterfly', 3], ['Long call', 2], ['Reverse iron condor', 2],
      ['Long put', 1], ['Long strangle', 1], ['Short put', 1]
    ].map(([name, weight]) => tilt(name, weight)));
    const width = () => pick([[5, 22], [10, 40], [15, 22], [20, 10], [25, 6]]);
    // Short strike distance from spot: mostly 15-60 points, occasionally tight
    const otm = () => (rnd(0, 1) < 0.06 ? rnd(0, 12) : rnd(20, 50) + Math.pow(rnd(0, 1), 2) * 40);
    const leg = (type, strike, side, qty = 1) => ({ type, strike, side, qty });

    switch (structure) {
      case 'Iron condor': {
        const sp = r5(spot - otm()), sc = r5(spot + otm());
        return [leg('P', sp - width(), 'long'), leg('P', sp, 'short'), leg('C', sc, 'short'), leg('C', sc + width(), 'long')];
      }
      case 'Put credit spread': {
        const sp = r5(spot - otm());
        return [leg('P', sp - width(), 'long'), leg('P', sp, 'short')];
      }
      case 'Call credit spread': {
        const sc = r5(spot + otm());
        return [leg('C', sc, 'short'), leg('C', sc + width(), 'long')];
      }
      case 'Short put':
        return [leg('P', r5(spot - otm() - 10), 'short')];
      case 'Put debit spread': {
        const lp = r5(spot + rnd(-15, 5));
        return [leg('P', lp - pick([[5, 11], [10, 29], [15, 2]]), 'short'), leg('P', lp, 'long')];
      }
      case 'Call debit spread': {
        const lc = r5(spot + rnd(-5, 15));
        return [leg('C', lc, 'long'), leg('C', lc + pick([[5, 3], [10, 5]]), 'short')];
      }
      case 'Call butterfly':
      case 'Put butterfly': {
        const type = structure[0];
        const center = r5(spot + (type === 'C' ? 1 : -1) * rnd(0, 25));
        return [leg(type, center - 5, 'long'), leg(type, center, 'short', 2), leg(type, center + 5, 'long')];
      }
      case 'Reverse iron condor': {
        const lp = r5(spot - rnd(5, 15)), lc = r5(spot + rnd(5, 15));
        return [leg('P', lp - 10, 'short'), leg('P', lp, 'long'), leg('C', lc, 'long'), leg('C', lc + 10, 'short')];
      }
      case 'Long call':
        return [leg('C', r5(spot + rnd(5, 15)), 'long')];
      case 'Long put':
        return [leg('P', r5(spot - rnd(5, 15)), 'long')];
      case 'Long strangle':
        return [leg('P', r5(spot - rnd(10, 25)), 'long'), leg('C', r5(spot + rnd(10, 25)), 'long')];
      default:
        return null;
    }
  }

  /**
   * Option price in index points: intrinsic plus a time value that decays
   * toward the close and falls off with distance from spot
   * @private
   */
  zeroDtePrice(type, strike, spot, minute) {
    const intrinsic = Math.max(0, type === 'P' ? strike - spot : spot - strike);
    const t = Math.sqrt(Math.max(0, 390 - minute) / 390);
    if (t === 0) return intrinsic;
    const extrinsic = 19 * t * Math.exp(-Math.abs(spot - strike) / (25 * t));
    return intrinsic + extrinsic;
  }

  /**
   * Simulate one trade through the day and emit its ledger rows
   * @private
   */
  zeroDteTradeRows(bar, path, entry, legs, orderId, pick, rnd) {
    const sign = leg => (leg.side === 'short' ? 1 : -1);
    // Prices in points, rounded to the nickel like SPX quotes
    const quote = (leg, minute) => Math.max(0.05, Math.round(this.zeroDtePrice(leg.type, leg.strike, path(minute), minute) * 20) / 20);
    const openPrices = legs.map(leg => quote(leg, entry));
    const net = legs.reduce((s, leg, i) => s + sign(leg) * leg.qty * openPrices[i], 0) * 100;
    const credit = net > 0;
    const basis = Math.abs(net);

    // Management mirrors a seller who mostly holds: most trades carry a
    // profit target, a minority a stop, and the rest ride to the bell
    const tp = rnd(0, 1) < 0.75 ? basis * (credit ? rnd(0.4, 0.75) : rnd(0.4, 1)) : Infinity;
    const sl = rnd(0, 1) < (credit ? 0.15 : 0.25) ? basis * (credit ? rnd(1.5, 2.5) : rnd(0.5, 0.8)) : Infinity;

    let exit = null;
    for (let m = entry + 5; m <= 385; m += 5) {
      const marks = legs.map(leg => Math.round(this.zeroDtePrice(leg.type, leg.strike, path(m), m) * 20) / 20);
      const closeNet = legs.reduce((s, leg, i) => s - sign(leg) * leg.qty * marks[i], 0) * 100;
      const pl = net + closeNet;
      if (pl >= tp || -pl >= sl) {
        exit = { minute: m, marks };
        break;
      }
    }

    const exp = this.formatExpiry(bar.d);
    const rows = [];
    const base = leg => {
      const k = leg.strike.toFixed(0);
      return {
        Symbol: `SPXW  ${bar.d.slice(2, 4)}${bar.d.slice(5, 7)}${bar.d.slice(8, 10)}${leg.type}${String(leg.strike * 1000).padStart(8, '0')}`,
        'Instrument Type': 'Equity Option',
        Quantity: String(leg.qty),
        Multiplier: '100',
        'Root Symbol': 'SPXW',
        'Underlying Symbol': 'SPX',
        'Expiration Date': exp,
        'Strike Price': k,
        'Call or Put': leg.type === 'P' ? 'PUT' : 'CALL',
        Currency: 'USD',
        _label: `SPXW ${exp} ${leg.type === 'P' ? 'Put' : 'Call'} ${leg.strike.toFixed(2)}`
      };
    };
    const money = n => {
      const fixed = Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return `${n < 0 ? '-' : ''}${fixed}`;
    };
    const tradeRow = (leg, minute, opening, price, order, commission) => {
      const b = base(leg);
      const sell = opening ? leg.side === 'short' : leg.side === 'long';
      const value = (sell ? 1 : -1) * price * 100 * leg.qty;
      const fees = -0.72 * leg.qty;
      const comm = -commission * leg.qty;
      const subType = `${sell ? 'Sell' : 'Buy'} to ${opening ? 'Open' : 'Close'}`;
      const label = b._label;
      delete b._label;
      return {
        Date: this.pacificTimestamp(bar.d, minute),
        Type: 'Trade',
        'Sub Type': subType,
        Action: subType.toUpperCase().replace(/ /g, '_'),
        ...b,
        Description: `${sell ? 'Sold' : 'Bought'} ${leg.qty} ${label} @ ${price.toFixed(2)}`,
        Value: money(value),
        'Average Price': money(value / leg.qty),
        Commissions: money(comm),
        Fees: money(fees),
        'Order #': String(order),
        Total: money(value + comm + fees)
      };
    };
    const receiveRow = (leg, minute, subType, action, value, fees, description) => {
      const b = base(leg);
      delete b._label;
      return {
        Date: this.pacificTimestamp(bar.d, minute),
        Type: 'Receive Deliver',
        'Sub Type': subType,
        Action: action,
        ...b,
        Description: description,
        Value: money(value),
        'Average Price': money(leg.qty ? value / leg.qty : 0),
        Commissions: '--',
        Fees: money(fees),
        'Order #': '',
        Total: money(value + fees)
      };
    };

    legs.forEach((leg, i) => rows.push(tradeRow(leg, entry, true, openPrices[i], orderId, 1)));

    if (exit) {
      // tastytrade waives commission on most closing orders
      const closeCommission = rnd(0, 1) < 0.7 ? 0 : 1;
      legs.forEach((leg, i) => rows.push(tradeRow(leg, exit.minute, false, Math.max(0.05, exit.marks[i]), orderId + 500000, closeCommission)));
      return rows;
    }

    legs.forEach(leg => {
      const intrinsic = Math.max(0, leg.type === 'P' ? leg.strike - bar.c : bar.c - leg.strike);
      const label = base(leg)._label;
      if (intrinsic <= 0) {
        rows.push(receiveRow(leg, 390, 'Expiration', leg.side === 'short' ? 'BUY_TO_CLOSE' : 'SELL_TO_CLOSE', 0, 0,
          `Removal of ${leg.qty.toFixed(1)} ${label.replace('SPXW', 'SPX')} due to expiration.`));
        return;
      }
      const cash = Math.round(intrinsic * 100 * leg.qty * 100) / 100;
      const short = leg.side === 'short';
      rows.push(receiveRow(leg, 450, short ? 'Assignment' : 'Exercise', '', 0, 0,
        `Removal of option due to ${short ? 'assignment' : 'exercise'}`));
      rows.push(receiveRow(leg, 450, short ? 'Cash Settled Assignment' : 'Cash Settled Exercise', '',
        short ? -cash : cash, -5 * leg.qty,
        `Cash settlement of ${leg.qty} ${label.replace('SPXW', 'SPX')}`));
    });
    return rows;
  }

  /**
   * ISO timestamp with the Pacific offset tastytrade uses
   * @private
   * @param {string} iso - YYYY-MM-DD trading day
   * @param {number} minute - Minutes after 9:30 ET (390 is the 4:00 close)
   */
  pacificTimestamp(iso, minute) {
    const ptMinutes = 6 * 60 + 30 + minute;
    const hh = String(Math.floor(ptMinutes / 60)).padStart(2, '0');
    const mm = String(ptMinutes % 60).padStart(2, '0');
    const ss = minute >= 390 ? '00' : String((minute * 37) % 60).padStart(2, '0');
    return `${iso}T${hh}:${mm}:${ss}${this.isPacificDst(iso) ? '-0700' : '-0800'}`;
  }

  /**
   * US daylight saving: second Sunday of March through first Sunday of November
   * @private
   */
  isPacificDst(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const nthSunday = (month, n) => {
      const first = new Date(Date.UTC(y, month - 1, 1)).getUTCDay();
      return 1 + ((7 - first) % 7) + (n - 1) * 7;
    };
    if (m < 3 || m > 11) return false;
    if (m > 3 && m < 11) return true;
    if (m === 3) return d >= nthSunday(3, 2);
    return d < nthSunday(11, 1);
  }

  /**
   * Format YYYY-MM-DD as MM/DD/YY
   * @private
   */
  formatExpiry(iso) {
    return `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(2, 4)}`;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DemoDataGenerator;
}
