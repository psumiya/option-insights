/**
 * AI Context
 * Turns the trades in the current view into a compact plain-text summary a
 * person can paste into Claude, with a fixed preamble and their question.
 * Totals, breakdowns and the largest trades only: never the raw CSV rows.
 * Pure: no DOM, no network, the same text for the same trades.
 */

const AiContext = (function () {
  const RANGE_LABELS = {
    last5tradingdays: 'last 5 trading days',
    last10tradingdays: 'last 10 trading days',
    last7days: 'last 7 days',
    last30days: 'last 30 days',
    last12months: 'last 12 months',
    ytd: 'year to date',
    alltime: 'all time'
  };

  const STATUS_LABELS = {
    closed: 'closed positions only',
    open: 'open positions only',
    all: 'open and closed positions'
  };

  const QUESTIONS = [
    {
      id: 'diagnosis',
      label: 'What’s working',
      text: 'Looking at the whole summary, what am I doing well, what patterns stand out, '
        + 'and what one or two changes would most improve my results?'
    },
    {
      id: 'edge',
      label: 'Edge or luck',
      text: 'Which of my strategies show a real edge, and which could just be luck at this '
        + 'sample size? Use the edge check figures.'
    },
    {
      id: 'risk',
      label: 'Risk check',
      text: 'Have I taken undue risk recently? Look at trades per day, re-entries after a loss '
        + 'and max loss per trade, and tell me whether the way I am trading is sustainable.'
    },
    {
      id: 'rules',
      label: 'Rules to follow',
      text: 'What are the top five (or fewer) things that have worked for me, weighed against '
        + 'the risk taken, that I should follow with discipline from here?'
    },
    {
      id: 'index',
      label: 'Index vs single names',
      text: 'Am I better off sticking to index options than trading single stocks? Compare '
        + 'them on win rate, P/L and risk.'
    }
  ];

  const PREAMBLE = [
    'Below is a summary of my own options trading results, computed by Option Insights '
      + 'from my broker export. Please answer my question at the end using only these figures.',
    'If the question needs data the summary does not include, say what is missing rather than '
      + 'guessing. Treat small samples with caution; the edge check marks groups too small to judge.',
    'This is a review of my own past trading, so please do not recommend specific securities to '
      + 'buy or sell. Keep the answer to short prose and cite the figures you rely on.'
  ].join('\n\n');

  const TOP_SYMBOLS = 12;
  const TOP_TRADES = 5;
  const OPEN_LIMIT = 10;

  // ===== formatting =====

  function money(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    const rounded = Math.round(Number(value));
    const abs = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${rounded < 0 ? '-' : ''}$${abs}`;
  }

  function percent(value) {
    return value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}%`;
  }

  function toDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  function day(value) {
    return ResearchAnalytics.marketDay(value) || '—';
  }

  function table(headers, rows) {
    if (!rows.length) return '';
    const line = cells => `| ${cells.join(' | ')} |`;
    return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n');
  }

  function section(title, body) {
    return body ? `## ${title}\n\n${body}` : '';
  }

  // ===== scope =====

  /**
   * Plain description of the filters behind the summary
   * @param {Object} filters - { dateRange: { type }, positionStatus }
   * @param {Object} selection - { symbols, strategies, notSymbols, notStrategies }
   * @returns {string}
   */
  function describeScope(filters, selection) {
    const options = filters || {};
    const picks = selection || {};
    const range = RANGE_LABELS[options.dateRange && options.dateRange.type] || RANGE_LABELS.alltime;
    const status = STATUS_LABELS[options.positionStatus] || STATUS_LABELS.all;
    const parts = [range, status];

    const list = (values, label) => {
      if (values && values.length) parts.push(`${label} ${values.join(', ')}`);
    };
    list(picks.symbols, 'only symbols');
    list(picks.strategies, 'only strategies');
    list(picks.notSymbols, 'excluding symbols');
    list(picks.notStrategies, 'excluding strategies');

    return parts.join('; ');
  }

  // ===== sections =====

  function isClosed(trade) {
    return trade.Result !== 'Open' && !!trade.Exit;
  }

  function pl(trade) {
    return Number(trade.ProfitLoss) || 0;
  }

  function overview(closed, open, trades, scope) {
    const entries = closed.map(trade => toDate(trade.Entry)).filter(Boolean).sort((a, b) => a - b);
    const exits = closed.map(trade => toDate(trade.Exit)).filter(Boolean).sort((a, b) => a - b);
    const brokers = [...new Set(trades.map(trade => trade.Account).filter(Boolean))].sort();
    const hasFees = trades.some(trade => Number(trade.Commissions) > 0 || Number(trade.Fees) > 0);

    const lines = [
      `Scope: ${scope || 'all trades'}.`,
      `Closed trades: ${closed.length}${exits.length ? `, closed between ${day(exits[0])} and ${day(exits[exits.length - 1])}` : ''}`
        + `${entries.length ? ` (first opened ${day(entries[0])})` : ''}. Open positions: ${open.length}.`,
      hasFees
        ? 'P/L is net of commissions and fees.'
        : 'The export carries no fee columns, so P/L may be gross of commissions and fees.'
    ];
    if (brokers.length) lines.push(`Broker: ${brokers.join(', ')}.`);
    return lines.join('\n');
  }

  function totals(closed) {
    const stats = ResearchAnalytics.winLossStats(closed);
    const edge = ResearchAnalytics.edgeCheck(closed).overall;
    const values = closed.map(pl);

    return [
      `- Net P/L: ${money(stats.net)} over ${stats.n} closed trades`,
      `- Win rate: ${percent(stats.winRate)} (break-even win rate at these averages: ${percent(stats.breakevenWinRate)})`,
      `- Average win: ${money(stats.avgWin)}; average loss: ${money(stats.avgLoss)}; average per trade: ${money(stats.expectancy)}`,
      `- Largest win: ${money(Math.max(...values))}; largest loss: ${money(Math.min(...values))}`,
      `- Edge check on the average per trade: ${edgeText(edge)}`
    ].join('\n');
  }

  function edgeText(row) {
    if (!row.verdict) return `not judged (${row.n} trade${row.n === 1 ? '' : 's'}, under 10)`;
    const verdicts = { positive: 'edge', negative: 'losing', unclear: 'can’t tell yet' };
    return `${verdicts[row.verdict]} (95% range ${money(row.ciLow)} to ${money(row.ciHigh)}, t ${row.t === null ? '—' : row.t.toFixed(2)})`;
  }

  function byStrategy(closed) {
    const edge = ResearchAnalytics.edgeCheck(closed).byStrategy;
    return table(
      ['Strategy', 'Trades', 'Win rate', 'Net P/L', 'Avg per trade', 'Edge check'],
      edge.map(row => {
        const group = closed.filter(trade => (trade.Strategy || 'Unknown') === row.label);
        const stats = ResearchAnalytics.winLossStats(group);
        return [row.label, row.n, percent(stats.winRate), money(stats.net), money(stats.expectancy), edgeText(row)];
      })
    );
  }

  function byUnderlying(closed) {
    const groups = new Map();
    closed.forEach(trade => {
      const symbol = trade.Symbol || 'Unknown';
      if (!groups.has(symbol)) groups.set(symbol, []);
      groups.get(symbol).push(trade);
    });

    const ranked = [...groups.entries()]
      .sort((a, b) => (b[1].length - a[1].length) || (a[0] < b[0] ? -1 : 1));
    const rows = ranked.slice(0, TOP_SYMBOLS).map(([symbol, group]) => {
      const stats = ResearchAnalytics.winLossStats(group);
      return [symbol, stats.n, percent(stats.winRate), money(stats.net)];
    });

    const rest = ranked.slice(TOP_SYMBOLS).flatMap(([, group]) => group);
    if (rest.length) {
      const stats = ResearchAnalytics.winLossStats(rest);
      rows.push([`${ranked.length - TOP_SYMBOLS} other symbols`, stats.n, percent(stats.winRate), money(stats.net)]);
    }
    return table(['Underlying', 'Trades', 'Win rate', 'Net P/L'], rows);
  }

  function byMonth(closed) {
    const months = new Map();
    closed.forEach(trade => {
      const key = day(trade.Exit).slice(0, 7);
      if (!months.has(key)) months.set(key, []);
      months.get(key).push(trade);
    });
    return table(
      ['Month closed', 'Trades', 'Win rate', 'Net P/L'],
      [...months.keys()].sort().map(key => {
        const stats = ResearchAnalytics.winLossStats(months.get(key));
        return [key, stats.n, percent(stats.winRate), money(stats.net)];
      })
    );
  }

  function statRows(groups, labels) {
    return Object.keys(groups)
      .filter(key => groups[key].n)
      .map(key => {
        const stats = groups[key];
        return [labels ? labels[key] || key : key, stats.n, percent(stats.winRate), money(stats.net), money(stats.expectancy)];
      });
  }

  const STAT_HEADERS = ['Trades', 'Win rate', 'Net P/L', 'Avg per trade'];

  function byDte(closed) {
    return table(['Days to expiration at entry', ...STAT_HEADERS],
      statRows(ResearchAnalytics.dteBucketStats(closed)));
  }

  function byDirection(closed) {
    const split = ResearchAnalytics.directionSplit(closed);
    const labels = {
      bullish: 'Bullish', bearish: 'Bearish', neutral: 'Neutral',
      credit: 'Credit (sold premium)', debit: 'Debit (bought premium)',
      'bullish-credit': 'Bullish, credit', 'bullish-debit': 'Bullish, debit',
      'bearish-credit': 'Bearish, credit', 'bearish-debit': 'Bearish, debit'
    };
    const rows = [
      ...statRows(split.byDirection, labels),
      ...statRows(split.byPremium, labels),
      ...statRows(split.byDirectionAndPremium, labels)
    ];
    return table(['Group', ...STAT_HEADERS], rows);
  }

  function byTime(closed) {
    const entry = ResearchAnalytics.entryTimeStats(closed);
    if (entry.excludedNoTime === closed.length) return '';
    const hold = ResearchAnalytics.holdTimeStats(closed);

    const windowLabels = {};
    entry.windows.forEach(window => {
      windowLabels[window.id] = window.label;
      windowLabels[`${window.id}-credit`] = `${window.label}, credit`;
      windowLabels[`${window.id}-debit`] = `${window.label}, debit`;
    });
    const holdLabels = {};
    hold.buckets.forEach(bucket => { holdLabels[bucket.id] = bucket.label; });

    return [
      'Time opened, New York time:',
      table(['Opened', ...STAT_HEADERS], [
        ...statRows(entry.byWindow, windowLabels),
        ...statRows(entry.byWindowAndPremium, windowLabels)
      ]),
      'Time held:',
      table(['Held', ...STAT_HEADERS], statRows(hold.byBucket, holdLabels))
    ].join('\n\n');
  }

  function risk(trades, closed) {
    const lines = [];

    const withRisk = closed.filter(trade => Number(trade.MaxLoss) > 0);
    if (withRisk.length) {
      const risks = withRisk.map(trade => Number(trade.MaxLoss)).sort((a, b) => a - b);
      const median = risks[Math.floor(risks.length / 2)];
      const onRisk = withRisk.map(trade => pl(trade) / Number(trade.MaxLoss) * 100);
      const avgOnRisk = onRisk.reduce((total, value) => total + value, 0) / onRisk.length;
      lines.push(`- Max loss known for ${withRisk.length} of ${closed.length} closed trades `
        + '(defined-risk spreads and anything bought for a debit; fees excluded)');
      lines.push(`- Max loss per trade: median ${money(median)}, largest ${money(risks[risks.length - 1])}`);
      lines.push(`- Average P/L as a share of max loss: ${percent(avgOnRisk)}`);
    } else {
      lines.push('- Max loss per trade is not known for this export (it needs the opening premium, '
        + 'which only TastyTrade exports carry)');
    }

    const perDay = new Map();
    trades.forEach(trade => {
      const key = day(trade.Entry);
      if (key !== '—') perDay.set(key, (perDay.get(key) || 0) + 1);
    });
    if (perDay.size) {
      const counts = [...perDay.entries()].sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? 1 : -1));
      const avg = [...perDay.values()].reduce((total, n) => total + n, 0) / perDay.size;
      lines.push(`- Trades opened per active day: average ${avg.toFixed(1)}, busiest ${counts[0][1]} on ${counts[0][0]}`);
    }

    const timed = closed.filter(trade =>
      ResearchAnalytics.withClockTime(trade.Entry) && ResearchAnalytics.withClockTime(trade.Exit));
    if (timed.length) {
      const reentries = timed.filter(trade => {
        const entry = toDate(trade.Entry);
        return timed.some(other => other !== trade
          && other.Symbol === trade.Symbol
          && pl(other) < 0
          && day(other.Exit) === day(trade.Entry)
          && toDate(other.Exit) < entry);
      });
      const net = reentries.reduce((total, trade) => total + pl(trade), 0);
      lines.push(`- Same-day re-entries after a loss (a trade opened on an underlying after another `
        + `trade on it closed at a loss earlier that day): ${reentries.length}, netting ${money(net)}`);
    }

    return lines.join('\n');
  }

  function tradeRow(trade) {
    const dte = trade.DaysToExpireAtEntry;
    return [
      day(trade.Exit || trade.Entry),
      trade.Symbol || '—',
      trade.Strategy || '—',
      dte === null || dte === undefined ? '—' : dte,
      money(pl(trade)),
      Number(trade.MaxLoss) > 0 ? money(trade.MaxLoss) : '—'
    ];
  }

  function extremes(closed) {
    const sorted = closed.slice().sort((a, b) => (pl(b) - pl(a)) || (day(a.Exit) < day(b.Exit) ? -1 : 1));
    const headers = ['Closed', 'Symbol', 'Strategy', 'DTE at entry', 'P/L', 'Max loss'];
    const wins = sorted.filter(trade => pl(trade) > 0).slice(0, TOP_TRADES);
    const losses = sorted.filter(trade => pl(trade) < 0).reverse().slice(0, TOP_TRADES);
    return [
      wins.length ? `Largest wins:\n\n${table(headers, wins.map(tradeRow))}` : '',
      losses.length ? `Largest losses:\n\n${table(headers, losses.map(tradeRow))}` : ''
    ].filter(Boolean).join('\n\n');
  }

  function openPositions(open) {
    if (!open.length) return '';
    const shown = open
      .slice()
      .sort((a, b) => (toDate(b.Entry) || 0) - (toDate(a.Entry) || 0))
      .slice(0, OPEN_LIMIT);
    const rows = shown.map(trade => [
      day(trade.Entry),
      trade.Symbol || '—',
      trade.Strategy || '—',
      trade.DaysToExpireAtEntry ?? '—',
      Number(trade.MaxLoss) > 0 ? money(trade.MaxLoss) : '—'
    ]);
    const more = open.length > shown.length ? `\n\n${open.length - shown.length} more open positions not listed.` : '';
    return table(['Opened', 'Symbol', 'Strategy', 'DTE at entry', 'Max loss'], rows) + more;
  }

  // ===== public =====

  /**
   * The summary text for a set of trades
   * @param {Array} trades - Enriched trades in the current view, open and closed
   * @param {Object} [options] - { scope } plain description of the filters
   * @returns {string} - Markdown summary, empty when there are no trades
   */
  function build(trades, options = {}) {
    const all = trades || [];
    if (!all.length) return '';

    const closed = all.filter(isClosed);
    const open = all.filter(trade => !isClosed(trade));

    const parts = [
      '# My options trading summary',
      overview(closed, open, all, options.scope)
    ];

    if (closed.length) {
      parts.push(
        section('Overall, closed trades', totals(closed)),
        section('By strategy', byStrategy(closed)),
        section('By underlying, most traded first', byUnderlying(closed)),
        section('By month', byMonth(closed)),
        section('By days to expiration', byDte(closed)),
        section('By market view and premium side', byDirection(closed)),
        section('By time of day', byTime(closed))
      );
    }

    parts.push(section('Risk', risk(all, closed)));
    if (closed.length) parts.push(section('Largest trades', extremes(closed)));
    parts.push(section('Open positions, most recent first', openPositions(open)));

    return parts.filter(Boolean).join('\n\n');
  }

  /**
   * The full text to paste: preamble, summary, then the question
   * @param {string} question - What the person wants to know
   * @param {string} summary - Output of build()
   * @returns {string}
   */
  function compose(question, summary) {
    return [PREAMBLE, summary, `## My question\n\n${String(question || '').trim()}`].join('\n\n');
  }

  return { QUESTIONS, PREAMBLE, describeScope, build, compose };
})();

if (typeof window !== 'undefined') {
  window.AiContext = AiContext;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AiContext;
}
