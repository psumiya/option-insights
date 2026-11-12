/**
 * Robinhood strategy labels follow each opening of a contract, not the contract
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

const row = (date, description, transCode, quantity, amount) => ({
  'Activity Date': date,
  'Process Date': date,
  'Settle Date': date,
  Instrument: description.split(' ')[0],
  Description: description,
  'Trans Code': transCode,
  Quantity: String(quantity),
  Price: '',
  Amount: amount
});

const convert = rows => {
  const log = console.log;
  console.log = () => {};
  try {
    return new RobinhoodAdapter().groupTransactions(rows);
  } finally {
    console.log = log;
  }
};

const SHORT = 'XYZ 12/19/2025 Put $100.00';
const LONG = 'XYZ 12/19/2025 Put $95.00';

test('a contract opened twice under different strategies keeps each label', () => {
  const trades = convert([
    row('11/7/2025', SHORT, 'BTC', 1, '($50.00)'),
    row('11/5/2025', SHORT, 'STO', 1, '$150.00'),
    row('11/4/2025', SHORT, 'BTC', 1, '($100.00)'),
    row('11/4/2025', LONG, 'STC', 1, '$40.00'),
    row('11/3/2025', SHORT, 'STO', 1, '$300.00'),
    row('11/3/2025', LONG, 'BTO', 1, '($120.00)')
  ]);

  const summary = trades
    .sort((a, b) => a.Entry - b.Entry)
    .map(t => ({ strategy: t.Strategy, credit: t.Credit, closed: t.Exit !== null }));
  assert.deepStrictEqual(summary, [
    { strategy: 'Put Credit Spread', credit: 120, closed: true },
    { strategy: 'Short Put', credit: 100, closed: true }
  ]);
});

test('adding to an open position stays one trade labeled by its first opening', () => {
  const trades = convert([
    row('11/6/2025', SHORT, 'BTC', 2, '($100.00)'),
    row('11/5/2025', SHORT, 'STO', 1, '$150.00'),
    row('11/3/2025', SHORT, 'STO', 1, '$300.00'),
    row('11/3/2025', LONG, 'BTO', 1, '($120.00)')
  ]);
  assert.strictEqual(trades.length, 1);
  assert.strictEqual(trades[0].Strategy, 'Put Credit Spread');
  assert.strictEqual(trades[0].Credit, 230);
});

test('a same-day add and full close listed close-first closes that leg', () => {
  const trades = convert([
    row('11/5/2025', SHORT, 'BTC', 2, '($100.00)'),
    row('11/5/2025', SHORT, 'STO', 1, '$150.00'),
    row('11/3/2025', SHORT, 'STO', 1, '$300.00'),
    row('11/3/2025', LONG, 'BTO', 1, '($120.00)')
  ]);
  assert.strictEqual(trades.length, 1);
  assert.strictEqual(trades[0].Strategy, 'Put Credit Spread');
  assert.strictEqual(trades[0].RealizedPL, 350);
  assert.strictEqual(trades[0].Exit, null);
});

const P1 = 'SPY 11/10/2026 Put $580.00';
const P2 = 'SPY 11/10/2026 Put $585.00';
const C1 = 'SPY 11/10/2026 Call $600.00';
const C2 = 'SPY 11/10/2026 Call $605.00';
const DAY = '11/10/2026';
const condorOpen = [
  row(DAY, P1, 'BTO', 1, '($10.00)'),
  row(DAY, P2, 'STO', 1, '$40.00'),
  row(DAY, C1, 'STO', 1, '$40.00'),
  row(DAY, C2, 'BTO', 1, '($10.00)')
];

test('an iron condor closed leg by leg is one trade with the whole P/L', () => {
  const trades = convert([
    ...condorOpen,
    row(DAY, P2, 'BTC', 1, '($5.00)'),
    row(DAY, C1, 'BTC', 1, '($90.00)'),
    row(DAY, C2, 'STC', 1, '$30.00'),
    row(DAY, `Option Expiration for ${P1}`, 'OEXP', '1', '')
  ]);
  assert.strictEqual(trades.length, 1);
  assert.strictEqual(trades[0].Strategy, 'Iron Condor');
  assert.notStrictEqual(trades[0].Exit, null);
  assert.strictEqual(trades[0].Debit, 5);
  assert.strictEqual(trades[0].RealizedPL, -5);
});

test('a half-closed iron condor stays open with the closed legs realized', () => {
  const trades = convert([
    ...condorOpen,
    row(DAY, P2, 'BTC', 1, '($5.00)')
  ]);
  assert.strictEqual(trades.length, 1);
  assert.strictEqual(trades[0].Exit, null);
  assert.strictEqual(trades[0].RealizedPL, 35);
});

test('an expiration closes its contract', () => {
  const trades = convert([
    row('11/3/2025', SHORT, 'STO', 1, '$300.00'),
    row('12/19/2025', `Option Expiration for ${SHORT}`, 'OEXP', '1S', '')
  ]);
  assert.strictEqual(trades.length, 1);
  assert.notStrictEqual(trades[0].Exit, null);
  assert.strictEqual(trades[0].RealizedPL, 300);
});

test('an expiration of a contract opened before the export adds no trade', () => {
  const trades = convert([
    row('12/19/2025', `Option Expiration for ${SHORT}`, 'OEXP', '1', '')
  ]);
  assert.strictEqual(trades.length, 0);
});
