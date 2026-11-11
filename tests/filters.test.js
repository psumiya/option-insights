/**
 * Trading-day date windows and the exclude mode of the filter chips
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(repoRoot, path), 'utf8');

const AnalyticsEngine = new Function(`${read('js/analytics-engine.js')}\nreturn AnalyticsEngine;`)();
const DashboardController = new Function(`${read('js/dashboard-controller.js')}\nreturn DashboardController;`)();

const ymd = date => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

// ===== trading-day windows =====

test('five trading days from a Wednesday reach back to the previous Thursday', () => {
  // Wed 2026-11-11 → Thu 11-05, Fri 11-06, Mon 11-09, Tue 11-10, Wed 11-11
  const start = AnalyticsEngine.tradingDaysBack(new Date(2026, 10, 11, 15, 30), 5);
  assert.deepStrictEqual(ymd(start), [2026, 11, 5]);
  assert.strictEqual(start.getHours(), 0);
});

test('a weekend today does not count as a trading day', () => {
  // Sun 2026-11-15 → Mon 11-09 through Fri 11-13
  assert.deepStrictEqual(ymd(AnalyticsEngine.tradingDaysBack(new Date(2026, 10, 15), 5)), [2026, 11, 9]);
  assert.deepStrictEqual(ymd(AnalyticsEngine.tradingDaysBack(new Date(2026, 10, 15), 10)), [2026, 11, 2]);
});

test('filterByDateRange keeps closes inside the last five trading days, today included', () => {
  const engine = new AnalyticsEngine();
  const now = new Date(2026, 10, 11, 12, 0);
  const closed = (month, day) => ({ Entry: new Date(2026, month, day - 1), Exit: new Date(2026, month, day, 15, 0) });
  const trades = [closed(10, 4), closed(10, 5), closed(10, 11)];

  const kept = engine.filterByDateRange(trades, 'last5tradingdays', now);
  assert.deepStrictEqual(kept.map(trade => trade.Exit.getDate()), [5, 11]);
  assert.strictEqual(engine.filterByDateRange(trades, 'last10tradingdays', now).length, 3);
});

// ===== exclude mode =====

const book = [
  { Symbol: 'SPX', Strategy: 'Iron Condor' },
  { Symbol: 'SPX', Strategy: 'Bull Put Spread' },
  { Symbol: 'NDX', Strategy: 'Iron Condor' },
  { Symbol: 'SOFI', Strategy: 'Short Put' }
];
const selection = overrides => ({ ...DashboardController.emptySelection(), ...overrides });
const symbolsOf = trades => trades.map(trade => `${trade.Symbol} ${trade.Strategy}`);

test('an empty selection keeps every trade', () => {
  assert.strictEqual(DashboardController.applySelection(book, selection({})).length, 4);
});

test('excluding a symbol drops it and keeps the rest', () => {
  assert.deepStrictEqual(
    symbolsOf(DashboardController.applySelection(book, selection({ notSymbols: ['NDX'] }))),
    ['SPX Iron Condor', 'SPX Bull Put Spread', 'SOFI Short Put']
  );
});

test('an exclusion narrows alongside picks in the other dimension', () => {
  assert.deepStrictEqual(
    symbolsOf(DashboardController.applySelection(book,
      selection({ strategies: ['Iron Condor'], notSymbols: ['NDX'] }))),
    ['SPX Iron Condor']
  );
});

test('excluding a strategy works the same way', () => {
  assert.deepStrictEqual(
    symbolsOf(DashboardController.applySelection(book,
      selection({ symbols: ['SPX'], notStrategies: ['Bull Put Spread'] }))),
    ['SPX Iron Condor']
  );
});

test('the selection survives a round trip through the URL', () => {
  const original = selection({ symbols: ['SPX'], notSymbols: ['NDX', 'SOFI'], notStrategies: ['Short Put'] });
  const params = DashboardController.selectionToParams(original, new URLSearchParams());

  assert.strictEqual(params.get('not-symbol'), 'NDX,SOFI');
  assert.strictEqual(params.has('strategy'), false);
  assert.deepStrictEqual(DashboardController.selectionFromParams(params), original);
});
