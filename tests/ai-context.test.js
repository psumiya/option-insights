/**
 * The summary the Ask Claude view copies: what it carries, what it leaves
 * out, and the text wrapped around it
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(repoRoot, path), 'utf8');

const RA = new Function(`${read('js/research-analytics.js')}\nreturn ResearchAnalytics;`)();
const AC = new Function('ResearchAnalytics', `${read('js/ai-context.js')}\nreturn AiContext;`)(RA);

// New York is UTC-5 in January
const et = (day, hour, minute) => new Date(Date.UTC(2026, 0, day, hour + 5, minute));

function trade(day, symbol, strategy, profitLoss, extra = {}) {
  return {
    Symbol: symbol,
    Strategy: strategy,
    ProfitLoss: profitLoss,
    Result: profitLoss > 0 ? 'Win' : 'Loss',
    Entry: et(day, 10, 5),
    Exit: et(day, 15, 30),
    DaysToExpireAtEntry: 0,
    Commissions: 1,
    Fees: 0.5,
    Account: 'TastyTrade',
    MaxLoss: 400,
    ...extra
  };
}

function book() {
  const trades = [];
  for (let day = 5; day <= 16; day++) {
    trades.push(trade(day, 'SPX', 'Iron Condor', day % 4 === 0 ? -300 : 120));
  }
  trades.push(trade(20, 'NDX', 'Bear Call Spread', -250, { Exit: et(20, 11, 0) }));
  trades.push(trade(20, 'NDX', 'Bull Put Spread', 90, { Entry: et(20, 12, 0) }));
  trades.push({
    Symbol: 'SOFI', Strategy: 'Short Put', Result: 'Open', ProfitLoss: 0,
    Entry: et(22, 10, 5), Exit: null, DaysToExpireAtEntry: 30, Account: 'TastyTrade'
  });
  return trades;
}

test('an empty view has no summary', () => {
  assert.strictEqual(AC.build([]), '');
  assert.strictEqual(AC.build(null), '');
});

test('the summary carries the scope, counts and every section for a timed export', () => {
  const summary = AC.build(book(), { scope: 'all time; open and closed positions' });

  assert.match(summary, /Scope: all time; open and closed positions\./);
  assert.match(summary, /Closed trades: 14/);
  assert.match(summary, /Open positions: 1\./);
  assert.match(summary, /net of commissions and fees/);
  [
    '## Overall, closed trades', '## By strategy', '## By underlying', '## By month',
    '## By days to expiration', '## By market view and premium side', '## By time of day',
    '## Risk', '## Largest trades', '## Open positions'
  ].forEach(heading => assert.ok(summary.includes(heading), heading));
  assert.match(summary, /\| Iron Condor \| 12 \|/);
  assert.match(summary, /\| SOFI \| Short Put \| 30 \|/);
});

test('the risk section reports max loss, busiest day and a same-day re-entry after a loss', () => {
  const summary = AC.build(book());

  assert.match(summary, /Max loss known for 14 of 14 closed trades/);
  assert.match(summary, /busiest 2 on 2026-01-20/);
  // The NDX bull put opened at 12:00 after the NDX bear call closed at 11:00 for a loss
  assert.match(summary, /Same-day re-entries after a loss[^\n]*: 1, netting \$90/);
});

test('a date-only export without fees or max loss says what it lacks', () => {
  const trades = book().map(entry => ({
    ...entry,
    Entry: '2026-01-05',
    Exit: entry.Exit ? '2026-01-06' : null,
    Commissions: 0,
    Fees: 0,
    MaxLoss: null
  }));
  const summary = AC.build(trades);

  assert.match(summary, /may be gross of commissions and fees/);
  assert.match(summary, /Max loss per trade is not known/);
  assert.ok(!summary.includes('## By time of day'));
  assert.ok(!summary.includes('re-entries'));
});

test('the summary never carries raw export fields', () => {
  const trades = book().map(entry => ({ ...entry, 'Order #': '987654', _metadata: { strategyGroupId: 'abc123' } }));
  const summary = AC.build(trades);

  assert.ok(!summary.includes('987654'));
  assert.ok(!summary.includes('abc123'));
});

test('a large book stays compact', () => {
  const symbols = Array.from({ length: 40 }, (_, i) => `SYM${i}`);
  const trades = Array.from({ length: 600 }, (_, i) =>
    trade(1 + (i % 28), symbols[i % symbols.length], i % 3 ? 'Bull Put Spread' : 'Iron Condor', i % 5 ? 80 : -250));
  const summary = AC.build(trades);

  assert.ok(summary.length < 12000, `summary is ${summary.length} characters`);
  assert.match(summary, /28 other symbols/);
});

test('the same trades always give the same summary', () => {
  assert.strictEqual(AC.build(book()), AC.build(book()));
});

test('compose puts the instructions first and the question last', () => {
  const text = AC.compose('  Why did August go badly?  ', 'SUMMARY');

  assert.ok(text.startsWith(AC.PREAMBLE));
  assert.ok(text.includes('\n\nSUMMARY\n\n'));
  assert.ok(text.endsWith('## My question\n\nWhy did August go badly?'));
});

test('describeScope names the range, status and every chip', () => {
  assert.strictEqual(
    AC.describeScope(
      { dateRange: { type: 'last5tradingdays' }, positionStatus: 'closed' },
      { symbols: ['SPX'], strategies: [], notSymbols: ['NDX', 'SOFI'], notStrategies: ['Short Put'] }
    ),
    'last 5 trading days; closed positions only; only symbols SPX; excluding symbols NDX, SOFI; excluding strategies Short Put'
  );
  assert.strictEqual(AC.describeScope({}, {}), 'all time; open and closed positions');
});

test('every suggested question has an id, a short label and full text', () => {
  const ids = AC.QUESTIONS.map(question => question.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  AC.QUESTIONS.forEach(question => {
    assert.ok(question.label.length <= 24, question.label);
    assert.ok(question.text.endsWith('?') || question.text.endsWith('.'), question.id);
  });
});
