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

  const shortLeg = trades
    .filter(t => t.Strike === 100)
    .sort((a, b) => a.Entry - b.Entry)
    .map(t => ({ strategy: t.Strategy, credit: t.Credit, closed: t.Exit !== null }));
  assert.deepStrictEqual(shortLeg, [
    { strategy: 'Put Credit Spread', credit: 200, closed: true },
    { strategy: 'Short Put', credit: 100, closed: true }
  ]);
  assert.deepStrictEqual(trades.filter(t => t.Strike === 95).map(t => t.Strategy), ['Put Credit Spread']);
});

test('adding to an open position stays one trade labeled by its first opening', () => {
  const trades = convert([
    row('11/6/2025', SHORT, 'BTC', 2, '($100.00)'),
    row('11/5/2025', SHORT, 'STO', 1, '$150.00'),
    row('11/3/2025', SHORT, 'STO', 1, '$300.00'),
    row('11/3/2025', LONG, 'BTO', 1, '($120.00)')
  ]);
  const shortLeg = trades.filter(t => t.Strike === 100);
  assert.strictEqual(shortLeg.length, 1);
  assert.strictEqual(shortLeg[0].Strategy, 'Put Credit Spread');
  assert.strictEqual(shortLeg[0].Credit, 350);
});

test('a same-day add and full close listed close-first is one closed trade', () => {
  const trades = convert([
    row('11/5/2025', SHORT, 'BTC', 2, '($100.00)'),
    row('11/5/2025', SHORT, 'STO', 1, '$150.00'),
    row('11/3/2025', SHORT, 'STO', 1, '$300.00'),
    row('11/3/2025', LONG, 'BTO', 1, '($120.00)')
  ]);
  const shortLeg = trades.filter(t => t.Strike === 100);
  assert.strictEqual(shortLeg.length, 1);
  assert.strictEqual(shortLeg[0].Strategy, 'Put Credit Spread');
  assert.notStrictEqual(shortLeg[0].Exit, null);
});
