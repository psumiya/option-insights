import { test } from 'node:test';
import assert from 'node:assert';
import { parseTasty } from '../js/tastyAdapter.js';

test('parseTasty converts CSV rows using TastyAdapter', () => {
  const trades = parseTasty('tests/sample-data/Tasty.csv');
  
  // Verify we got trades back
  assert.ok(trades.length > 0, 'Should have converted at least one trade');
  // console.log(`\nTotal trades converted: ${trades.length}`);
  
  // Find first option trade (skip Money Movement entries)
  const firstOptionTrade = trades.find(t => t.Type === 'Trade' && t['Instrument Type'] === 'Equity Option');
  assert.ok(firstOptionTrade, 'Should have at least one option trade');
  
  // Verify trade structure
  assert.ok(firstOptionTrade.Symbol, 'Trade should have Symbol');
  assert.ok(firstOptionTrade.Date, 'Trade should have Date');
  assert.ok(firstOptionTrade.Strategy, 'Trade should have Strategy classification');
  
  // console.log('\nSample trade:', firstOptionTrade);
});
