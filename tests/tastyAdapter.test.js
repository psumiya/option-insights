/**
 * TastyTrade import, end to end on the sample export
 * Runs the same entry point the app uses (TastyAdapter.convert calls
 * convertTastyWithStrategyInference) over tests/sample-data/Tasty.csv.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const mapper = new Function(
  `${readFileSync(join(repoRoot, 'js/tasty-strategy-mapper.js'), 'utf8')}
   return { parseCSV, convertTastyWithStrategyInference };`
)();

function convertSample() {
  const rows = mapper.parseCSV(readFileSync(join(repoRoot, 'tests/sample-data/Tasty.csv'), 'utf8'));
  const log = console.log;
  console.log = () => {};
  try {
    return { rows, trades: mapper.convertTastyWithStrategyInference(rows) };
  } finally {
    console.log = log;
  }
}

test('the sample export converts into trades', () => {
  const { rows, trades } = convertSample();
  assert.ok(rows.length > 0, 'sample CSV should parse into rows');
  assert.ok(trades.length > 0, 'should convert at least one trade');
});

test('every converted trade carries the fields the dashboard reads', () => {
  const { trades } = convertSample();
  trades.forEach(trade => {
    assert.ok(trade.Symbol, 'Symbol');
    assert.ok(trade.Strategy, 'Strategy');
    assert.ok(trade.Entry, 'Entry');
    assert.ok(Number.isFinite(trade.Debit), 'Debit is numeric');
    assert.ok(Number.isFinite(trade.Credit), 'Credit is numeric');
  });
});

test('multi-leg strategies are recognized, not just single legs', () => {
  const { trades } = convertSample();
  const strategies = new Set(trades.map(trade => trade.Strategy));
  assert.ok(strategies.size > 1, `expected several strategies, got ${[...strategies].join(', ')}`);
});
