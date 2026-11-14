import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(repoRoot, 'js/market-calendar.js'), 'utf8');
const Cal = new Function(`${src}\nreturn MarketCalendar;`)();

test('weekends and NYSE holidays are not trading days', () => {
    assert.strictEqual(Cal.isTradingDay('2026-11-14'), false);
    assert.strictEqual(Cal.isTradingDay('2026-11-15'), false);
    assert.strictEqual(Cal.isTradingDay('2026-11-26'), false);
    assert.strictEqual(Cal.isTradingDay('2026-07-03'), false);
    assert.strictEqual(Cal.isTradingDay('2025-01-09'), false);
    assert.strictEqual(Cal.isTradingDay('2026-11-27'), true);
});

test('dates outside the covered years throw', () => {
    assert.throws(() => Cal.isTradingDay('2028-01-03'), /covers 2025-2027/);
    assert.throws(() => Cal.isTradingDay('11/13/2026'), /YYYY-MM-DD/);
});

test('tradingDaysBetween skips weekends and holidays', () => {
    assert.deepStrictEqual(
        Cal.tradingDaysBetween('2026-11-24', '2026-11-30'),
        ['2026-11-24', '2026-11-25', '2026-11-27', '2026-11-30']
    );
});

test('a trading day counts as completed only after 16:15 ET', () => {
    assert.strictEqual(Cal.lastCompletedTradingDay(new Date('2026-11-13T21:14:00Z')), '2026-11-12');
    assert.strictEqual(Cal.lastCompletedTradingDay(new Date('2026-11-13T21:15:00Z')), '2026-11-13');
});

test('the cutoff follows daylight saving time', () => {
    assert.strictEqual(Cal.lastCompletedTradingDay(new Date('2026-07-15T20:14:00Z')), '2026-07-14');
    assert.strictEqual(Cal.lastCompletedTradingDay(new Date('2026-07-15T20:15:00Z')), '2026-07-15');
});

test('weekends and holidays fall back to the prior trading day', () => {
    assert.strictEqual(Cal.lastCompletedTradingDay(new Date('2026-11-15T18:00:00Z')), '2026-11-13');
    assert.strictEqual(Cal.lastCompletedTradingDay(new Date('2026-11-26T23:00:00Z')), '2026-11-25');
    assert.strictEqual(Cal.lastCompletedTradingDay(new Date('2026-11-14T03:00:00Z')), '2026-11-13');
});

test('etDate converts a UTC timestamp to the New York calendar date', () => {
    assert.strictEqual(Cal.etDate(new Date('2026-11-14T03:00:00Z')), '2026-11-13');
    assert.strictEqual(Cal.etDate(new Date('2026-11-14T05:00:00Z')), '2026-11-14');
});
