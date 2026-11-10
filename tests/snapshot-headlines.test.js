/**
 * Snapshot headlines
 * The sentences at the top of the report, and the filter each one applies.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(repoRoot, 'js/snapshot-headlines.js'), 'utf8');
const SH = new Function(`${source}\nreturn SnapshotHeadlines;`)();

const trade = (Symbol, Strategy, ProfitLoss, Result = ProfitLoss > 0 ? 'Win' : 'Loss') =>
  ({ Symbol, Strategy, ProfitLoss, Result });

const repeat = (n, make) => Array.from({ length: n }, (_, i) => make(i));

const sample = [
  ...repeat(5, () => trade('TSLA', 'Long Put', -10)),
  ...repeat(3, () => trade('SPY', 'Long Put', -8)),
  trade('AAPL', 'Covered Call', -2),
  ...repeat(5, () => trade('META', 'Covered Call', 4)),
  trade('META', 'Covered Call', -1),
  trade('QQQ', 'Iron Condor', 3)
];

const byId = (headlines, id) => headlines.find(h => h.id === id);

test('names the two underlyings carrying most of the losses', () => {
  const headline = byId(SH.build(sample), 'loss-concentration');
  assert.deepStrictEqual(headline.action, { dimension: 'symbol', values: ['TSLA', 'SPY'] });
  // TSLA -50, SPY -24, AAPL -2: 74 of 76
  assert.match(SH.toText(headline), /^TSLA and SPY account for 97% of losses across 3 losing underlyings\.$/);
});

test('calls out the best underlying with its P/L', () => {
  const headline = byId(SH.build(sample), 'best-underlying');
  assert.deepStrictEqual(headline.action, { dimension: 'symbol', values: ['META'] });
  assert.strictEqual(SH.toText(headline), 'META is your best underlying: +$19.00 over 6 trades.');
});

test('weakest strategy needs enough trades to count', () => {
  const headline = byId(SH.build(sample), 'weakest-strategy');
  assert.deepStrictEqual(headline.action, { dimension: 'strategy', values: ['Long Put'] });
  assert.strictEqual(SH.toText(headline), 'Long Put is your weakest strategy: -$74.00 over 8 trades, 0% win rate.');

  const thin = SH.build([...repeat(4, () => trade('X', 'Thin', -50)), ...repeat(6, () => trade('Y', 'Thick', 5))]);
  assert.strictEqual(byId(thin, 'weakest-strategy'), undefined);
});

test('most reliable strategy beats the overall win rate and is not the weakest one', () => {
  const headline = byId(SH.build(sample), 'reliable-strategy');
  assert.deepStrictEqual(headline.action, { dimension: 'strategy', values: ['Covered Call'] });
  assert.strictEqual(SH.toText(headline), 'Covered Call wins most often: 5 of 7 trades (71%), netting +$17.00.');
});

test('open positions and a single-symbol view drop the symbol headlines', () => {
  const tsla = sample.filter(t => t.Symbol === 'TSLA');
  const withOpen = [...tsla, trade('TSLA', 'Long Put', 0, 'Open')];
  const headlines = SH.build(withOpen);
  assert.strictEqual(byId(headlines, 'loss-concentration'), undefined);
  assert.strictEqual(byId(headlines, 'best-underlying'), undefined);
});

test('too few closed trades yields nothing', () => {
  assert.deepStrictEqual(SH.build([trade('A', 'S', 1), trade('B', 'S', -1)]), []);
  assert.deepStrictEqual(SH.build([]), []);
  assert.deepStrictEqual(SH.build(undefined), []);
});
