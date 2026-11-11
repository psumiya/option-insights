/**
 * Robinhood strategy inference from the opening legs of one instrument on one day
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const RobinhoodAdapter = new Function(
  `${readFileSync(join(repoRoot, 'js/broker-adapters.js'), 'utf8')}
   return RobinhoodAdapter;`
)();
const { parseCSVLine } = new Function(
  `${readFileSync(join(repoRoot, 'js/tasty-strategy-mapper.js'), 'utf8')}
   return { parseCSVLine };`
)();

const adapter = new RobinhoodAdapter();
const expiry = new Date(2025, 10, 28);
const leg = (transCode, type, strike, exp = expiry) => ({ transCode, type, strike, expiry: exp });
const infer = (...legs) => adapter._inferStrategy(legs);

test('single legs', () => {
  assert.strictEqual(infer(leg('STO', 'Put', 26)), 'Short Put');
  assert.strictEqual(infer(leg('BTO', 'Put', 26)), 'Long Put');
  assert.strictEqual(infer(leg('STO', 'Call', 30)), 'Short Call');
  assert.strictEqual(infer(leg('BTO', 'Call', 30)), 'Long Call');
});

test('put verticals use strike order', () => {
  assert.strictEqual(infer(leg('STO', 'Put', 100), leg('BTO', 'Put', 95)), 'Put Credit Spread');
  assert.strictEqual(infer(leg('STO', 'Put', 95), leg('BTO', 'Put', 100)), 'Bear Put Spread');
});

test('call verticals use strike order', () => {
  assert.strictEqual(infer(leg('STO', 'Call', 100), leg('BTO', 'Call', 105)), 'Call Credit Spread');
  assert.strictEqual(infer(leg('STO', 'Call', 105), leg('BTO', 'Call', 100)), 'Bull Call Spread');
});

test('verticals across expiries are not spreads', () => {
  const later = new Date(2025, 11, 19);
  assert.strictEqual(infer(leg('STO', 'Put', 100), leg('BTO', 'Put', 95, later)), 'Custom');
  assert.strictEqual(infer(leg('STO', 'Call', 105), leg('BTO', 'Call', 100, later)), 'Custom');
});

test('straddle or strangle by strike, for sold and bought pairs', () => {
  assert.strictEqual(infer(leg('STO', 'Put', 100), leg('STO', 'Call', 100)), 'Straddle');
  assert.strictEqual(infer(leg('STO', 'Put', 95), leg('STO', 'Call', 105)), 'Strangle');
  assert.strictEqual(infer(leg('BTO', 'Put', 100), leg('BTO', 'Call', 100)), 'Straddle');
  assert.strictEqual(infer(leg('BTO', 'Put', 95), leg('BTO', 'Call', 105)), 'Strangle');
});

test('mixed put and call directions are custom', () => {
  assert.strictEqual(infer(leg('STO', 'Put', 95), leg('BTO', 'Call', 105)), 'Custom');
});

test('iron condor', () => {
  assert.strictEqual(
    infer(leg('BTO', 'Put', 90), leg('STO', 'Put', 95), leg('STO', 'Call', 105), leg('BTO', 'Call', 110)),
    'Iron Condor'
  );
});

test('sample export labels bought puts as Long Put and verticals by strike order', () => {
  const lines = readFileSync(join(repoRoot, 'tests/sample-data/Hood.csv'), 'utf8').trim().split(/\r?\n/);
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()]));
  });
  const log = console.log;
  console.log = () => {};
  let trades;
  try {
    trades = adapter.convert(rows);
  } finally {
    console.log = log;
  }
  const counts = {};
  trades.forEach(t => { counts[t.Strategy] = (counts[t.Strategy] || 0) + 1; });
  assert.strictEqual(counts['Long Put'], 1);
  assert.strictEqual(counts['Short Put'], 21);
  assert.strictEqual(counts['Put Credit Spread'], 46);
  assert.strictEqual(counts['Call Credit Spread'], 10);
  assert.strictEqual(counts['Straddle'], 6);
});
