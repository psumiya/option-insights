/**
 * Snapshot headlines
 * Turns the filtered trades into a few plain sentences, each tied to the
 * symbol or strategy filter that lets you dig into it. Pure, so it runs
 * under node for tests.
 */
const SnapshotHeadlines = (() => {
  const MIN_STRATEGY_TRADES = 5;
  const MIN_LOSS_SHARE = 0.4;
  const MAX_HEADLINES = 4;

  const money = value => {
    const sign = value >= 0 ? '+$' : '-$';
    return sign + Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const percent = value => `${Math.round(value * 100)}%`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const tone = value => (value >= 0 ? 'profit' : 'loss');

  function group(trades, key) {
    const groups = new Map();
    trades.forEach(trade => {
      const name = trade[key];
      if (!name) return;
      if (!groups.has(name)) groups.set(name, { name, pl: 0, trades: 0, wins: 0 });
      const entry = groups.get(name);
      entry.pl += trade.ProfitLoss;
      entry.trades += 1;
      if (trade.Result === 'Win') entry.wins += 1;
    });
    return Array.from(groups.values());
  }

  function lossConcentration(bySymbol) {
    if (bySymbol.length < 3) return null;
    const losers = bySymbol.filter(g => g.pl < 0).sort((a, b) => a.pl - b.pl);
    if (losers.length === 0) return null;
    const lossTotal = losers.reduce((sum, g) => sum + g.pl, 0);

    if (losers.length === 1) {
      const [only] = losers;
      return {
        id: 'loss-concentration',
        action: { dimension: 'symbol', values: [only.name] },
        parts: [
          { text: only.name, strong: true },
          { text: ' is the only underlying in the red, at ' },
          { text: money(only.pl), tone: 'loss' },
          { text: '.' }
        ]
      };
    }

    const top = losers.slice(0, 2);
    const share = top.reduce((sum, g) => sum + g.pl, 0) / lossTotal;
    if (share < MIN_LOSS_SHARE) return null;
    return {
      id: 'loss-concentration',
      action: { dimension: 'symbol', values: top.map(g => g.name) },
      parts: [
        { text: top[0].name, strong: true },
        { text: ' and ' },
        { text: top[1].name, strong: true },
        { text: ' account for ' },
        { text: percent(share), strong: true },
        { text: ` of losses across ${plural(losers.length, 'losing underlying', 'losing underlyings')}.` }
      ]
    };
  }

  function bestUnderlying(bySymbol) {
    if (bySymbol.length < 2) return null;
    const best = bySymbol.reduce((a, b) => (b.pl > a.pl ? b : a));
    if (best.pl <= 0) return null;
    return {
      id: 'best-underlying',
      action: { dimension: 'symbol', values: [best.name] },
      parts: [
        { text: best.name, strong: true },
        { text: ' is your best underlying: ' },
        { text: money(best.pl), tone: 'profit' },
        { text: ` over ${plural(best.trades, 'trade', 'trades')}.` }
      ]
    };
  }

  function weakestStrategy(byStrategy) {
    const eligible = byStrategy.filter(g => g.trades >= MIN_STRATEGY_TRADES);
    if (byStrategy.length < 2 || eligible.length === 0) return null;
    const worst = eligible.reduce((a, b) => (b.pl < a.pl ? b : a));
    if (worst.pl >= 0) return null;
    return {
      id: 'weakest-strategy',
      action: { dimension: 'strategy', values: [worst.name] },
      parts: [
        { text: worst.name, strong: true },
        { text: ' is your weakest strategy: ' },
        { text: money(worst.pl), tone: 'loss' },
        { text: ` over ${plural(worst.trades, 'trade', 'trades')}, ` },
        { text: percent(worst.wins / worst.trades), strong: true },
        { text: ' win rate.' }
      ]
    };
  }

  function mostReliableStrategy(byStrategy, overallWinRate, exclude) {
    const eligible = byStrategy.filter(g =>
      g.trades >= MIN_STRATEGY_TRADES && g.name !== exclude
    );
    if (byStrategy.length < 2 || eligible.length === 0) return null;
    const best = eligible.reduce((a, b) => {
      const rateA = a.wins / a.trades;
      const rateB = b.wins / b.trades;
      return rateB > rateA || (rateB === rateA && b.pl > a.pl) ? b : a;
    });
    const rate = best.wins / best.trades;
    if (rate <= overallWinRate) return null;
    return {
      id: 'reliable-strategy',
      action: { dimension: 'strategy', values: [best.name] },
      parts: [
        { text: best.name, strong: true },
        { text: ' wins most often: ' },
        { text: `${best.wins} of ${best.trades}`, strong: true },
        { text: ` trades (${percent(rate)}), netting ` },
        { text: money(best.pl), tone: tone(best.pl) },
        { text: '.' }
      ]
    };
  }

  function build(trades) {
    const closed = (trades || []).filter(trade =>
      trade.Result !== 'Open' && Number.isFinite(trade.ProfitLoss)
    );
    if (closed.length < 3) return [];

    const bySymbol = group(closed, 'Symbol');
    const byStrategy = group(closed, 'Strategy');
    const overallWinRate = closed.filter(trade => trade.Result === 'Win').length / closed.length;

    const weakest = weakestStrategy(byStrategy);
    return [
      lossConcentration(bySymbol),
      bestUnderlying(bySymbol),
      weakest,
      mostReliableStrategy(byStrategy, overallWinRate, weakest && weakest.action.values[0])
    ].filter(Boolean).slice(0, MAX_HEADLINES);
  }

  /** Plain-text form, for aria labels and tests. */
  const toText = headline => headline.parts.map(part => part.text).join('');

  return { build, toText, MIN_STRATEGY_TRADES };
})();

if (typeof window !== 'undefined') {
  window.SnapshotHeadlines = SnapshotHeadlines;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SnapshotHeadlines;
}
