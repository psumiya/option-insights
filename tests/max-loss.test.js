/**
 * Max loss per trade
 * The opening premium and contract count the TastyTrade mapper records, the
 * dollars at risk the analytics engine derives from them, and the P/L-on-risk
 * figure the Trades view ranks by.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(repoRoot, path), 'utf8');

const mapper = new Function(`${read('js/tasty-strategy-mapper.js')}
  return { convertTastyWithStrategyInference };`)();
const AnalyticsEngine = new Function(`${read('js/analytics-engine.js')}\nreturn AnalyticsEngine;`)();
const TradesTable = new Function(`${read('js/trades-table.js')}\nreturn TradesTable;`)();

let orderSeq = 7000;

function leg(overrides) {
  return {
    Date: '2026-03-02T09:30:00-0800',
    Type: 'Trade',
    'Sub Type': 'Sell to Open',
    Action: 'SELL_TO_OPEN',
    Symbol: 'AMD   260320P00100000',
    'Instrument Type': 'Equity Option',
    Description: '',
    Value: '100.00',
    Quantity: '1',
    Commissions: '-1.00',
    Fees: '-0.12',
    'Underlying Symbol': 'AMD',
    'Expiration Date': '03/20/26',
    'Strike Price': '100',
    'Call or Put': 'PUT',
    'Order #': '',
    Total: '',
    ...overrides
  };
}

function putSpread(sellRows, buyRows) {
  const order = String(orderSeq++);
  return mapper.convertTastyWithStrategyInference([
    ...sellRows.map(fields => leg({ 'Order #': order, ...fields })),
    ...buyRows.map(fields => leg({
      'Order #': order, Action: 'BUY_TO_OPEN', 'Sub Type': 'Buy to Open',
      Symbol: 'AMD   260320P00095000', 'Strike Price': '95', ...fields
    }))
  ]);
}

// ===== TastyTrade opening fields =====

test('a put credit spread records its net opening credit and contracts per leg', () => {
  const [trade] = putSpread(
    [{ Value: '300.00', Quantity: '2' }],
    [{ Value: '-100.00', Quantity: '2' }]
  );

  assert.strictEqual(trade.Strategy, 'Bull Put Spread');
  assert.strictEqual(trade.OpenPremium, 200);
  assert.strictEqual(trade.OpenContracts, 2);
  assert.strictEqual(trade.Width, 5);
  assert.strictEqual(AnalyticsEngine.maxLoss(trade), 800);
});

test('a leg filled across several rows still counts its contracts once', () => {
  const [trade] = putSpread(
    [{ Value: '150.00', Quantity: '1' }, { Value: '150.00', Quantity: '1' }],
    [{ Value: '-100.00', Quantity: '2' }]
  );

  assert.strictEqual(trade.OpenContracts, 2);
  assert.strictEqual(trade.OpenPremium, 200);
});

// ===== maxLoss rules =====

const base = { Symbol: 'SPX', OpenContracts: 1 };

test('a credit spread risks its width less the credit', () => {
  assert.strictEqual(AnalyticsEngine.maxLoss({
    ...base, Strategy: 'Iron Condor', Width: 10, OpenPremium: 240
  }), 760);
  assert.strictEqual(AnalyticsEngine.maxLoss({
    ...base, Strategy: 'Call Credit Spread', Width: 5, OpenPremium: 120, OpenContracts: 3
  }), 1380);
});

test('a credit spread with no width or contracts has no known max loss', () => {
  assert.strictEqual(AnalyticsEngine.maxLoss({
    ...base, Strategy: 'Iron Condor', Width: null, OpenPremium: 240
  }), null);
  assert.strictEqual(AnalyticsEngine.maxLoss({
    ...base, Strategy: 'Iron Condor', Width: 10, OpenPremium: 240, OpenContracts: null
  }), null);
});

test('anything bought for a debit risks the debit', () => {
  assert.strictEqual(AnalyticsEngine.maxLoss({ ...base, Strategy: 'Bear Put Spread', OpenPremium: -150 }), 150);
  assert.strictEqual(AnalyticsEngine.maxLoss({ ...base, Strategy: 'Long Call', OpenPremium: -420.5 }), 420.5);
  assert.strictEqual(AnalyticsEngine.maxLoss({ ...base, Strategy: 'Straddle', OpenPremium: -900 }), 900);
});

test('undefined risk and missing data return null', () => {
  assert.strictEqual(AnalyticsEngine.maxLoss({ ...base, Strategy: 'Short Put', OpenPremium: 300 }), null);
  assert.strictEqual(AnalyticsEngine.maxLoss({ ...base, Strategy: 'Strangle', OpenPremium: 500 }), null);
  assert.strictEqual(AnalyticsEngine.maxLoss({ ...base, Strategy: 'Custom', OpenPremium: -100 }), null);
  assert.strictEqual(AnalyticsEngine.maxLoss({ ...base, Strategy: 'Long Call' }), null);
  assert.strictEqual(AnalyticsEngine.maxLoss({ ...base, Strategy: 'Long Call', OpenPremium: null }), null);
});

test('futures options are left out, since their multiplier is not 100', () => {
  assert.strictEqual(AnalyticsEngine.maxLoss({
    Symbol: '/ES', Strategy: 'Long Call', OpenPremium: -500, OpenContracts: 1
  }), null);
});

test('enrichTrade carries MaxLoss onto the trade', () => {
  const engine = new AnalyticsEngine();
  const enriched = engine.enrichTrade({
    ...base, Strategy: 'Bull Put Spread', Width: 5, OpenPremium: 110,
    Entry: '2026-03-02', Expiry: '2026-03-20', Credit: 110, Debit: 0
  });
  assert.strictEqual(enriched.MaxLoss, 390);
});

// ===== P/L on risk =====

test('returnOnRisk is realized P/L over max loss, as a percentage', () => {
  assert.strictEqual(TradesTable.returnOnRisk({ Result: 'Win', RealizedPL: 97.5, MaxLoss: 390 }), 25);
  assert.strictEqual(TradesTable.returnOnRisk({ Result: 'Loss', RealizedPL: -390, MaxLoss: 390 }), -100);
});

test('returnOnRisk is blank for open positions and unknown risk', () => {
  assert.strictEqual(TradesTable.returnOnRisk({ Result: 'Open', RealizedPL: 50, MaxLoss: 390 }), null);
  assert.strictEqual(TradesTable.returnOnRisk({ Result: 'Win', RealizedPL: 50, MaxLoss: null }), null);
  assert.strictEqual(TradesTable.returnOnRisk({ Result: 'Win', RealizedPL: 50, MaxLoss: 0 }), null);
});
