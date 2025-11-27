/**
 * Quick test for Robinhood strategy inference
 */

// Load the adapter
import { RobinhoodAdapter } from './js/broker-adapters.js';

const adapter = new RobinhoodAdapter();

// Test data: Iron Condor example
const testRows = [
  // Opening legs on same date
  { 'Activity Date': '1/15/2025', 'Trans Code': 'STO', 'Instrument': 'SPY', 'Description': 'SPY 2/21/2025 Put $550.00', 'Quantity': '1', 'Amount': '$50.00' },
  { 'Activity Date': '1/15/2025', 'Trans Code': 'BTO', 'Instrument': 'SPY', 'Description': 'SPY 2/21/2025 Put $545.00', 'Quantity': '1', 'Amount': '($30.00)' },
  { 'Activity Date': '1/15/2025', 'Trans Code': 'STO', 'Instrument': 'SPY', 'Description': 'SPY 2/21/2025 Call $580.00', 'Quantity': '1', 'Amount': '$45.00' },
  { 'Activity Date': '1/15/2025', 'Trans Code': 'BTO', 'Instrument': 'SPY', 'Description': 'SPY 2/21/2025 Call $585.00', 'Quantity': '1', 'Amount': '($25.00)' },
];

console.log('Testing Iron Condor detection...');
const trades = adapter.convert(testRows);

console.log('\nResults:');
trades.forEach(trade => {
  console.log(`${trade.Type} ${trade.Strike}: ${trade.Strategy}`);
});

// Test Put Credit Spread
const spreadRows = [
  { 'Activity Date': '1/20/2025', 'Trans Code': 'STO', 'Instrument': 'QQQ', 'Description': 'QQQ 2/28/2025 Put $450.00', 'Quantity': '1', 'Amount': '$100.00' },
  { 'Activity Date': '1/20/2025', 'Trans Code': 'BTO', 'Instrument': 'QQQ', 'Description': 'QQQ 2/28/2025 Put $445.00', 'Quantity': '1', 'Amount': '($60.00)' },
];

console.log('\n\nTesting Put Credit Spread detection...');
const spreadTrades = adapter.convert(spreadRows);

console.log('\nResults:');
spreadTrades.forEach(trade => {
  console.log(`${trade.Type} ${trade.Strike}: ${trade.Strategy}`);
});

// Test Strangle
const strangleRows = [
  { 'Activity Date': '1/25/2025', 'Trans Code': 'STO', 'Instrument': 'AAPL', 'Description': 'AAPL 3/15/2025 Put $180.00', 'Quantity': '1', 'Amount': '$75.00' },
  { 'Activity Date': '1/25/2025', 'Trans Code': 'STO', 'Instrument': 'AAPL', 'Description': 'AAPL 3/15/2025 Call $200.00', 'Quantity': '1', 'Amount': '$80.00' },
];

console.log('\n\nTesting Strangle detection...');
const strangleTrades = adapter.convert(strangleRows);

console.log('\nResults:');
strangleTrades.forEach(trade => {
  console.log(`${trade.Type} ${trade.Strike}: ${trade.Strategy}`);
});
