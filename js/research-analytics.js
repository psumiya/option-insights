/**
 * Research Analytics
 * Pure, deterministic statistics over enriched trade records for the Research
 * tab. Every function takes an already-filtered trade array plus explicit
 * parameters and returns the same result for the same input: no DOM access, no
 * unseeded randomness, no wall-clock reads, no network calls, no mutation of inputs.
 *
 * Ported from the externally developed analysis.py. Where the Python operated
 * on a `cash` column net of commissions and fees, this reads ProfitLoss, which
 * carries the same meaning after the Phase 1 corrections.
 */

const ResearchAnalytics = (function () {
  const STRUCTURES = {
    IRON_CONDOR: 'iron_condor',
    PUT_CREDIT_SPREAD: 'put_credit_spread',
    CALL_CREDIT_SPREAD: 'call_credit_spread'
  };

  // The dashboard's display labels for the three structures this tab analyzes.
  // TastyTrade inference and the Robinhood adapter name the same structures
  // differently, and a bull put spread is a put credit spread.
  const STRUCTURE_BY_LABEL = {
    'Iron Condor': STRUCTURES.IRON_CONDOR,
    'Bull Put Spread': STRUCTURES.PUT_CREDIT_SPREAD,
    'Put Credit Spread': STRUCTURES.PUT_CREDIT_SPREAD,
    'Bear Call Spread': STRUCTURES.CALL_CREDIT_SPREAD,
    'Call Credit Spread': STRUCTURES.CALL_CREDIT_SPREAD
  };

  const STRUCTURE_LABELS = {
    [STRUCTURES.IRON_CONDOR]: 'Iron Condor',
    [STRUCTURES.PUT_CREDIT_SPREAD]: 'Put Credit Spread',
    [STRUCTURES.CALL_CREDIT_SPREAD]: 'Call Credit Spread'
  };

  const DTE_CUT_LABELS = {
    all: 'All DTE',
    zero: '0DTE only',
    nonzero: 'DTE > 0'
  };

  // Market view and premium side of each strategy label the adapters produce.
  // A null side means the label alone cannot say: a straddle or butterfly can
  // be bought or sold, and stock has no premium.
  const STRATEGY_PROFILE = {
    'Long Call': { direction: 'bullish', premium: 'debit' },
    'Bull Call Spread': { direction: 'bullish', premium: 'debit' },
    'Short Put': { direction: 'bullish', premium: 'credit' },
    'Cash Secured Put': { direction: 'bullish', premium: 'credit' },
    'Bull Put Spread': { direction: 'bullish', premium: 'credit' },
    'Put Credit Spread': { direction: 'bullish', premium: 'credit' },
    'Covered Call': { direction: 'bullish', premium: 'credit' },
    'Long Stock': { direction: 'bullish', premium: null },
    'Long Future': { direction: 'bullish', premium: null },
    'Long Put': { direction: 'bearish', premium: 'debit' },
    'Bear Put Spread': { direction: 'bearish', premium: 'debit' },
    'Short Call': { direction: 'bearish', premium: 'credit' },
    'Bear Call Spread': { direction: 'bearish', premium: 'credit' },
    'Call Credit Spread': { direction: 'bearish', premium: 'credit' },
    'Short Stock': { direction: 'bearish', premium: null },
    'Short Future': { direction: 'bearish', premium: null },
    'Iron Condor': { direction: 'neutral', premium: 'credit' },
    'Butterfly': { direction: 'neutral', premium: null },
    'Butterfly Spread': { direction: 'neutral', premium: null },
    'Straddle': { direction: 'neutral', premium: null },
    'Strangle': { direction: 'neutral', premium: null }
  };

  const DIRECTIONS = ['bullish', 'bearish', 'neutral'];
  const PREMIUMS = ['credit', 'debit'];

  // Why a trade the active filter would otherwise have admitted was dropped
  const EXCLUSION_LABELS = {
    unmappedStructure: 'strategy out of scope',
    structureNotSelected: 'structure not selected',
    missingDte: 'no expiration data',
    noWidth: 'no spread width'
  };

  const DTE_BUCKETS = [
    { id: '0DTE', test: dte => dte === 0 },
    { id: '1-7DTE', test: dte => dte >= 1 && dte <= 7 },
    { id: '>7DTE', test: dte => dte > 7 }
  ];

  // Widths are in the underlying's own strike points, so the buckets only mean
  // something within one underlying. These are the fallback when none are given.
  const DEFAULT_WIDTHS = [5, 10, 20];
  const OTHER_WIDTH = 'Other';

  // ===== numeric helpers =====

  function round(value, places) {
    const factor = Math.pow(10, places);
    return Math.round(value * factor) / factor;
  }

  function sum(values) {
    return values.reduce((total, value) => total + value, 0);
  }

  function mean(values) {
    return values.length ? sum(values) / values.length : 0;
  }

  function pl(trade) {
    return Number(trade.ProfitLoss) || 0;
  }

  /**
   * Abramowitz & Stegun 7.1.26 approximation, max error ~1.5e-7. JavaScript has
   * no built-in erf and the runs-test p-value only survives to 3 decimals.
   */
  function erf(x) {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
      - 0.284496736) * t + 0.254829592) * t;
    return sign * (1 - poly * Math.exp(-ax * ax));
  }

  /**
   * Local calendar date as YYYY-MM-DD. Uses local components rather than
   * toISOString so a trade never lands on the previous day in negative offsets.
   */
  function dateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return null;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function entryTime(trade) {
    const date = trade.Entry instanceof Date ? trade.Entry : new Date(trade.Entry);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function byEntry(trades) {
    return trades.slice().sort((a, b) => entryTime(a) - entryTime(b));
  }

  // ===== structure mapping =====

  /**
   * Map a dashboard strategy label to a canonical structure identifier
   * @param {string} displayLabel - Strategy label as shown in the UI
   * @returns {string|null} - Canonical identifier, or null when out of scope
   */
  function canonicalStructure(displayLabel) {
    if (!displayLabel) return null;
    return STRUCTURE_BY_LABEL[String(displayLabel).trim()] || null;
  }

  /**
   * Display label for a canonical structure identifier
   * @param {string} structure - Canonical identifier
   * @returns {string} - Display label
   */
  function structureLabel(structure) {
    return STRUCTURE_LABELS[structure] || structure;
  }

  // ===== provenance =====

  /**
   * Plain-language description of a filter state
   * Every output's caption is derived from this, so no output can carry
   * hardcoded text that goes stale when the filter changes.
   * @param {Object} filter - { underlying, dteCut, structures }
   * @returns {string} - Description, e.g. "SPX · Iron Condor only · 0DTE only"
   */
  function describeFilter(filter) {
    const options = filter || {};
    const structures = options.structures && options.structures.length
      ? options.structures
      : null;

    const structureText = structures
      ? (structures.length === 1
        ? `${structureLabel(structures[0])} only`
        : structures.map(structureLabel).sort().join(', '))
      : 'All strategies';

    return [
      options.underlying || 'All underlyings',
      structureText,
      DTE_CUT_LABELS[options.dteCut || 'all'] || DTE_CUT_LABELS.all
    ].join(' · ');
  }

  /**
   * Caption for a single output: what cut it shows, how many trades back it,
   * and what those numbers leave out
   * @param {Object} filter - Active filter state
   * @param {Object} info - { n, excluded, extra }
   *   excluded: reason key to count, or { reason, count } pairs
   * @returns {string} - Caption line
   */
  function buildCaption(filter, info) {
    const details = info || {};
    const parts = [describeFilter(filter)];

    if (typeof details.n === 'number') {
      parts.push(`${details.n} closed trade${details.n === 1 ? '' : 's'}`);
    }

    const excluded = details.excluded || {};
    Object.keys(excluded).forEach(reason => {
      const count = excluded[reason];
      if (!count) return;
      const label = EXCLUSION_LABELS[reason] || reason;
      parts.push(`${count} excluded (${label})`);
    });

    if (details.extra) parts.push(details.extra);

    return parts.join(' · ');
  }

  // ===== filtering =====

  /**
   * Restrict trades to the active research cut
   * Closed trades only; open positions have no realized outcome to analyze.
   * @param {Array} trades - Enriched trade records
   * @param {Object} filter - { underlying, dteCut, structures }
   *   underlying: symbol, or null for all symbols
   *   dteCut: 'all' | 'zero' | 'nonzero'
   *   structures: array of canonical identifiers, or null for no structure filter
   * @returns {Object} - { trades, excluded } with per-reason exclusion counts
   */
  function applyFilter(trades, filter) {
    const options = filter || {};
    const underlying = options.underlying || null;
    const dteCut = options.dteCut || 'all';
    const structures = options.structures && options.structures.length
      ? options.structures
      : null;

    const excluded = {
      open: 0,
      underlying: 0,
      unmappedStructure: 0,
      structureNotSelected: 0,
      missingDte: 0
    };

    const kept = [];

    trades.forEach(trade => {
      if (!trade.Exit) {
        excluded.open++;
        return;
      }

      if (underlying && trade.Symbol !== underlying) {
        excluded.underlying++;
        return;
      }

      if (structures) {
        const structure = canonicalStructure(trade.Strategy);
        if (!structure) {
          excluded.unmappedStructure++;
          return;
        }
        if (structures.indexOf(structure) === -1) {
          excluded.structureNotSelected++;
          return;
        }
      }

      if (dteCut === 'zero' || dteCut === 'nonzero') {
        const dte = trade.DaysToExpireAtEntry;
        if (dte === null || dte === undefined) {
          excluded.missingDte++;
          return;
        }
        if (dteCut === 'zero' && dte !== 0) return;
        if (dteCut === 'nonzero' && dte <= 0) return;
      }

      kept.push(trade);
    });

    return { trades: kept, excluded: excluded };
  }

  // ===== core statistics =====

  /**
   * Win/loss summary for a set of trades
   * A trade at exactly zero counts as a loss: a scratch is not a win, and this
   * matches how the dashboard's own Result field classifies it.
   * @param {Array} trades - Closed trades
   * @returns {Object} - Summary statistics
   */
  function winLossStats(trades) {
    if (!trades.length) {
      return {
        n: 0,
        winRate: null,
        avgWin: null,
        avgLoss: null,
        breakevenWinRate: null,
        net: 0,
        worst: null,
        expectancy: null
      };
    }

    const values = trades.map(pl);
    const wins = values.filter(value => value > 0);
    const losses = values.filter(value => value <= 0);

    const avgWin = mean(wins);
    const avgLoss = mean(losses);
    const spread = avgWin + Math.abs(avgLoss);

    return {
      n: trades.length,
      winRate: round(wins.length / values.length * 100, 1),
      avgWin: round(avgWin, 2),
      avgLoss: round(avgLoss, 2),
      breakevenWinRate: spread > 0
        ? round(Math.abs(avgLoss) / spread * 100, 1)
        : null,
      net: round(sum(values), 2),
      worst: round(Math.min.apply(null, values), 2),
      expectancy: round(mean(values), 2)
    };
  }

  /**
   * Win/loss summary split into 0DTE, 1-7DTE and >7DTE buckets
   * Empty buckets are omitted so a table row never implies zero-trade activity.
   * @param {Array} trades - Closed trades
   * @returns {Object} - Bucket id to summary statistics, in ascending DTE order
   */
  function dteBucketStats(trades) {
    const withDte = trades.filter(trade =>
      trade.DaysToExpireAtEntry !== null && trade.DaysToExpireAtEntry !== undefined
    );

    const result = {};

    DTE_BUCKETS.forEach(bucket => {
      const group = withDte.filter(trade => bucket.test(trade.DaysToExpireAtEntry));
      if (group.length) {
        result[bucket.id] = winLossStats(group);
      }
    });

    return result;
  }

  /**
   * Win/loss summary split by structure
   * All three groups are always present: a structure with no trades is a
   * finding, not something to hide.
   * @param {Array} trades - Closed trades
   * @returns {Object} - Canonical identifier to summary statistics
   */
  function condorVsSingleSide(trades) {
    const result = {};

    [STRUCTURES.IRON_CONDOR, STRUCTURES.PUT_CREDIT_SPREAD, STRUCTURES.CALL_CREDIT_SPREAD]
      .forEach(structure => {
        const group = trades.filter(trade => canonicalStructure(trade.Strategy) === structure);
        result[structure] = winLossStats(group);
      });

    return result;
  }

  /**
   * Market view and premium side of a strategy label
   * @param {string} displayLabel - Strategy label as shown in the UI
   * @returns {Object} - { direction, premium }, each null when the label cannot say
   */
  function strategyProfile(displayLabel) {
    const profile = STRATEGY_PROFILE[String(displayLabel || '').trim()];
    return profile ? { ...profile } : { direction: null, premium: null };
  }

  /**
   * Win/loss summary split by market view, by premium side, and by both for
   * the directional trades
   * Every group is always present: a side never traded is a finding, not
   * something to hide. Trades whose label cannot place them are counted, by
   * label, rather than guessed.
   * @param {Array} trades - Closed trades
   * @returns {Object} - { byDirection, byPremium, byDirectionAndPremium,
   *   unclassifiedDirection, unclassifiedPremium }
   *   byDirectionAndPremium keys are 'bullish-credit', 'bullish-debit', and so on
   *   unclassified*: [{ label, n }] most frequent first
   */
  function directionSplit(trades) {
    const profiled = trades.map(trade => ({ trade, profile: strategyProfile(trade.Strategy) }));
    const statsWhere = test => winLossStats(profiled.filter(test).map(entry => entry.trade));

    const unclassified = side => {
      const counts = new Map();
      profiled.forEach(({ trade, profile }) => {
        if (profile[side]) return;
        const label = trade.Strategy || 'Unknown';
        counts.set(label, (counts.get(label) || 0) + 1);
      });
      return [...counts.entries()]
        .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))
        .map(([label, n]) => ({ label, n }));
    };

    const byDirection = {};
    DIRECTIONS.forEach(direction => {
      byDirection[direction] = statsWhere(entry => entry.profile.direction === direction);
    });

    const byPremium = {};
    PREMIUMS.forEach(premium => {
      byPremium[premium] = statsWhere(entry => entry.profile.premium === premium);
    });

    const byDirectionAndPremium = {};
    ['bullish', 'bearish'].forEach(direction => {
      PREMIUMS.forEach(premium => {
        byDirectionAndPremium[`${direction}-${premium}`] = statsWhere(entry =>
          entry.profile.direction === direction && entry.profile.premium === premium);
      });
    });

    return {
      byDirection,
      byPremium,
      byDirectionAndPremium,
      unclassifiedDirection: unclassified('direction'),
      unclassifiedPremium: unclassified('premium')
    };
  }

  // ===== width analyses =====

  function withWidth(trades) {
    return trades.filter(trade => {
      const width = Number(trade.Width);
      return Number.isFinite(width) && width > 0;
    });
  }

  /**
   * The bucket a spread width belongs to
   * @param {number} width - Spread width
   * @returns {string} - Bucket identifier
   */
  function widthBucket(width, widths = DEFAULT_WIDTHS) {
    return widths.indexOf(width) === -1 ? OTHER_WIDTH : `$${width}-wide`;
  }

  /**
   * The widths traded most often, smallest first
   * @param {Array} trades - Closed trades
   * @param {number} limit - How many widths to return
   * @returns {Array<number>}
   */
  function commonWidths(trades, limit) {
    const counts = new Map();
    withWidth(trades).forEach(trade => {
      const width = Number(trade.Width);
      counts.set(width, (counts.get(width) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]))
      .slice(0, limit)
      .map(([width]) => width)
      .sort((a, b) => a - b);
  }

  /**
   * Win/loss summary split by width bucket, plus average credit taken in
   * Every bucket is always present: a width nobody traded is a finding, not
   * something to hide.
   * @param {Array} trades - Closed trades
   * @returns {Object} - { byBucket, excludedNoWidth }
   */
  function widthBreakdown(trades, widths = DEFAULT_WIDTHS) {
    const usable = withWidth(trades);
    const byBucket = {};
    const bucketIds = widths.map(width => `$${width}-wide`).concat([OTHER_WIDTH]);

    bucketIds.forEach(bucketId => {
      const group = usable.filter(trade => widthBucket(Number(trade.Width), widths) === bucketId);
      const stats = winLossStats(group);
      stats.avgCreditCollected = round(
        mean(group.map(trade => Number(trade.OpenCredit) || 0)),
        2
      );
      byBucket[bucketId] = stats;
    });

    return {
      byBucket: byBucket,
      excludedNoWidth: trades.length - usable.length
    };
  }

  /**
   * What the same book would have returned at a uniform spread width
   * Rescales each trade's net P/L by target-over-actual width, holding the
   * win or loss outcome and the date fixed. Linear in width, which is roughly
   * right for max-loss outcomes and overstates partial ones.
   * @param {Array} trades - Closed trades
   * @param {Array} targetWidths - Widths to model
   * @returns {Object} - { actualNet, actualN, actualAvgWidth, byWidth, excludedNoWidth }
   */
  function widthCounterfactual(trades, targetWidths) {
    const usable = withWidth(trades);
    const byWidth = {};

    (targetWidths || []).forEach(target => {
      const scaled = usable.map(trade => pl(trade) * (target / Number(trade.Width)));
      byWidth[target] = round(sum(scaled), 2);
    });

    return {
      actualNet: round(sum(usable.map(pl)), 2),
      actualN: usable.length,
      actualAvgWidth: usable.length ? round(mean(usable.map(trade => Number(trade.Width))), 1) : null,
      byWidth: byWidth,
      excludedNoWidth: trades.length - usable.length
    };
  }

  // ===== small-sample checks =====

  /**
   * Wald-Wolfowitz runs test on the chronological win/loss sequence
   * Asks whether wins and losses alternate more or less than chance predicts.
   * @param {Array} trades - Closed trades
   * @returns {Object} - Test result, or counts plus a note when unusable
   */
  function runsTest(trades) {
    const sequence = byEntry(trades).map(trade => (pl(trade) > 0 ? 1 : 0));
    const wins = sum(sequence);
    const losses = sequence.length - wins;

    if (sequence.length < 10 || wins < 2 || losses < 2) {
      return {
        n: sequence.length,
        wins: wins,
        losses: losses,
        runs: null,
        expectedRuns: null,
        z: null,
        p: null,
        note: 'sample too small for a meaningful runs test'
      };
    }

    let runs = 1;
    for (let i = 1; i < sequence.length; i++) {
      if (sequence[i] !== sequence[i - 1]) runs++;
    }

    const total = wins + losses;
    const expectedRuns = (2 * wins * losses) / total + 1;
    const variance = (2 * wins * losses * (2 * wins * losses - total))
      / (total * total * (total - 1));
    const z = (runs - expectedRuns) / Math.sqrt(variance);
    const p = 1 - erf(Math.abs(z) / Math.SQRT2);

    return {
      n: sequence.length,
      wins: wins,
      losses: losses,
      runs: runs,
      expectedRuns: round(expectedRuns, 1),
      z: round(z, 2),
      p: round(p, 3),
      note: null
    };
  }

  /**
   * Share of total dollar losses carried by the largest losing trades
   * @param {Array} trades - Closed trades
   * @param {Array} topN - Loss counts to report, defaults to [3, 5]
   * @returns {Object} - { totalLoss, nLosses, shares, note }
   */
  function lossConcentration(trades, topN) {
    const counts = topN && topN.length ? topN : [3, 5];
    const losses = trades
      .map(pl)
      .filter(value => value < 0)
      .sort((a, b) => a - b);

    if (!losses.length) {
      return {
        totalLoss: 0,
        nLosses: 0,
        shares: {},
        note: 'no losing trades in this cut'
      };
    }

    const totalLoss = sum(losses);
    const shares = {};

    counts.forEach(n => {
      shares[n] = round(sum(losses.slice(0, n)) / totalLoss * 100, 1);
    });

    return {
      totalLoss: round(totalLoss, 2),
      nLosses: losses.length,
      shares: shares,
      note: null
    };
  }

  // Smallest group the edge check will judge; matches the runs test floor
  const EDGE_MIN_TRADES = 10;
  const BOOTSTRAP_RESAMPLES = 2000;
  const BOOTSTRAP_SEED = 0x5eed;

  /**
   * Mulberry32. Seeded so the bootstrap, and every statistic built on it,
   * returns the same result for the same trades.
   */
  function seededRandom(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function bootstrapMeanInterval(values) {
    const random = seededRandom(BOOTSTRAP_SEED);
    const n = values.length;
    const means = new Array(BOOTSTRAP_RESAMPLES);

    for (let b = 0; b < BOOTSTRAP_RESAMPLES; b++) {
      let total = 0;
      for (let i = 0; i < n; i++) {
        total += values[Math.floor(random() * n)];
      }
      means[b] = total / n;
    }

    means.sort((a, b) => a - b);
    return {
      low: means[Math.floor(0.025 * (BOOTSTRAP_RESAMPLES - 1))],
      high: means[Math.ceil(0.975 * (BOOTSTRAP_RESAMPLES - 1))]
    };
  }

  /**
   * Whether one group's average P/L per trade is distinguishable from zero
   * @param {string} label - Row label
   * @param {Array} trades - Closed trades in the group
   * @returns {Object} - { label, n, expectancy, t, ciLow, ciHigh, verdict, note }
   */
  function edgeRow(label, trades) {
    // Sorted by value so the seeded resample, and so the interval, cannot
    // depend on the order trades arrive in, including ties on entry time
    const values = trades.map(pl).sort((a, b) => a - b);
    const n = values.length;
    const expectancy = n ? round(mean(values), 2) : null;

    if (n < EDGE_MIN_TRADES) {
      return {
        label: label,
        n: n,
        expectancy: expectancy,
        t: null,
        ciLow: null,
        ciHigh: null,
        verdict: null,
        note: 'too few trades to judge'
      };
    }

    const average = mean(values);
    const variance = sum(values.map(value => (value - average) * (value - average))) / (n - 1);
    const standardError = Math.sqrt(variance / n);
    const interval = bootstrapMeanInterval(values);

    let verdict = 'unclear';
    if (interval.low > 0) verdict = 'positive';
    else if (interval.high < 0) verdict = 'negative';

    return {
      label: label,
      n: n,
      expectancy: expectancy,
      t: standardError > 0 ? round(average / standardError, 2) : null,
      ciLow: round(interval.low, 2),
      ciHigh: round(interval.high, 2),
      verdict: verdict,
      note: null
    };
  }

  /**
   * Edge or luck: for the whole cut and each strategy in it, whether the
   * average P/L per trade clears zero by more than resampling noise
   * The interval is a seeded percentile bootstrap of the mean, which needs no
   * normality assumption and so suits the lopsided P/L of short premium. The
   * t-statistic is reported beside it as the familiar yardstick.
   * Strategy rows run most-traded first, then alphabetically.
   * @param {Array} trades - Closed trades
   * @returns {Object} - { overall, byStrategy, minTrades }
   */
  function edgeCheck(trades) {
    const groups = new Map();
    trades.forEach(trade => {
      const label = trade.Strategy || 'Unknown';
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(trade);
    });

    const byStrategy = [...groups.entries()]
      .sort((a, b) => (b[1].length - a[1].length) || (a[0] < b[0] ? -1 : 1))
      .map(([label, group]) => edgeRow(label, group));

    return {
      overall: edgeRow('All trades in this cut', trades),
      byStrategy: byStrategy,
      minTrades: EDGE_MIN_TRADES
    };
  }

  // ===== chart shaping =====

  /**
   * One row per trading date for the calendar view
   * Keyed on entry date, so a date's P/L is what the positions opened that day
   * eventually returned. For 0DTE cuts entry and exit coincide; for longer
   * tenors this attributes the outcome to the day the risk was taken on.
   * @param {Array} trades - Closed trades
   * @returns {Array} - [{ date, net, n, strategies, category }] by date
   */
  function calendarSeries(trades) {
    const byDate = new Map();

    byEntry(trades).forEach(trade => {
      const key = dateKey(trade.Entry);
      if (!key) return;

      if (!byDate.has(key)) {
        byDate.set(key, { date: key, net: 0, n: 0, strategies: [] });
      }

      const row = byDate.get(key);
      row.net += pl(trade);
      row.n++;
      if (row.strategies.indexOf(trade.Strategy) === -1) {
        row.strategies.push(trade.Strategy);
      }
    });

    return [...byDate.values()]
      .map(row => ({
        date: row.date,
        net: round(row.net, 2),
        n: row.n,
        strategies: row.strategies.slice().sort(),
        category: row.strategies.length === 1 ? row.strategies[0] : 'Mixed'
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  /**
   * One row per trade for the bar view, plus the summary figures above it
   * Same filtering as calendarSeries but uncollapsed, so same-day trades read
   * as separate bars.
   * @param {Array} trades - Closed trades
   * @returns {Object} - { trades, net, avgPerTrade, n }
   */
  function barSeries(trades) {
    const ordered = byEntry(trades);
    const values = ordered.map(pl);

    return {
      trades: ordered.map(trade => ({
        date: dateKey(trade.Entry),
        net: round(pl(trade), 2),
        strategy: trade.Strategy,
        dte: trade.DaysToExpireAtEntry,
        width: Number.isFinite(Number(trade.Width)) ? Number(trade.Width) : null,
        symbol: trade.Symbol
      })),
      net: round(sum(values), 2),
      avgPerTrade: ordered.length ? round(mean(values), 2) : null,
      n: ordered.length
    };
  }

  return {
    STRUCTURES,
    STRUCTURE_LABELS,
    DTE_CUT_LABELS,
    EXCLUSION_LABELS,
    canonicalStructure,
    structureLabel,
    describeFilter,
    buildCaption,
    applyFilter,
    winLossStats,
    dteBucketStats,
    condorVsSingleSide,
    strategyProfile,
    directionSplit,
    widthBreakdown,
    commonWidths,
    widthCounterfactual,
    runsTest,
    lossConcentration,
    edgeCheck,
    calendarSeries,
    barSeries
  };
})();

// Export as global object for browser use (non-module)
if (typeof window !== 'undefined') {
  window.ResearchAnalytics = ResearchAnalytics;
}

// Also support CommonJS for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResearchAnalytics;
}
