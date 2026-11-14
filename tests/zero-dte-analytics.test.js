import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = ['js/market-calendar.js', 'js/spx-data.js', 'js/zero-dte-analytics.js']
    .map(f => readFileSync(join(repoRoot, f), 'utf8')).join('\n');
const { Z, SpxData } = new Function(`${src}\nreturn { Z: ZeroDteAnalytics, SpxData };`)();

const raw = (date, subType, strike, cp, exp, qty, total, order = '') => ({
    'Date': date,
    'Type': subType.includes('to') ? 'Trade' : 'Receive Deliver',
    'Sub Type': subType,
    'Symbol': `SPXW  ${exp.slice(6)}${exp.slice(0, 2)}${exp.slice(3, 5)}${cp[0]}0${strike}000`,
    'Instrument Type': 'Equity Option',
    'Quantity': String(qty),
    'Total': total,
    'Underlying Symbol': 'SPX',
    'Expiration Date': exp,
    'Strike Price': String(strike),
    'Call or Put': cp,
    'Order #': order
});

const fixture = [
    raw('2026-11-04T07:00:00-0800', 'Buy to Open', 7300, 'PUT', '11/04/26', 1, '-120.00', 'D'),
    raw('2026-11-04T13:00:00-0800', 'Expiration', 7300, 'PUT', '11/04/26', 1, '0.00'),

    raw('2026-11-05T10:00:00-0800', 'Sell to Open', 7550, 'CALL', '11/09/26', 1, '300.00', 'A'),

    raw('2026-11-06T06:45:00-0800', 'Sell to Open', 7400, 'PUT', '11/06/26', 1, '500.00', 'C'),
    raw('2026-11-06T06:45:00-0800', 'Buy to Open', 7395, 'PUT', '11/06/26', 1, '-300.00', 'C'),
    raw('2026-11-06T06:45:00-0800', 'Sell to Open', 7500, 'CALL', '11/06/26', 1, '400.00', 'C'),
    raw('2026-11-06T06:45:00-0800', 'Buy to Open', 7505, 'CALL', '11/06/26', 1, '-250.00', 'C'),
    raw('2026-11-06T14:00:00-0800', 'Expiration', 7400, 'PUT', '11/06/26', 1, '0.00'),
    raw('2026-11-06T14:00:00-0800', 'Expiration', 7395, 'PUT', '11/06/26', 1, '0.00'),
    raw('2026-11-06T14:00:00-0800', 'Assignment', 7500, 'CALL', '11/06/26', 1, '0.00'),
    raw('2026-11-06T14:00:00-0800', 'Cash Settled Assignment', 7500, 'CALL', '11/06/26', 1, '-800.00'),
    raw('2026-11-06T14:00:00-0800', 'Exercise', 7505, 'CALL', '11/06/26', 1, '0.00'),
    raw('2026-11-06T14:00:00-0800', 'Cash Settled Exercise', 7505, 'CALL', '11/06/26', 1, '300.00'),

    raw('2026-11-09T07:00:00-0800', 'Sell to Open', 7550, 'CALL', '11/09/26', 1, '200.00', 'B'),
    raw('2026-11-09T07:00:00-0800', 'Buy to Open', 7555, 'CALL', '11/09/26', 1, '-100.00', 'B'),
    raw('2026-11-09T08:00:00-0800', 'Buy to Close', 7550, 'CALL', '11/09/26', 1, '-150.00', 'E'),
    raw('2026-11-09T14:00:00-0800', 'Expiration', 7550, 'CALL', '11/09/26', 1, '0.00'),
    raw('2026-11-09T14:00:00-0800', 'Expiration', 7555, 'CALL', '11/09/26', 1, '0.00'),

    raw('2026-11-09T18:30:00-0800', 'Buy to Open', 7600, 'CALL', '11/10/26', 1, '-1,250.00', 'F')
].reverse();

const spx = {
    prevClose: 7400,
    bars: [
        { d: '2026-11-05', o: 7460, h: 7490, l: 7440, c: 7480 },
        { d: '2026-11-06', o: 7450, h: 7510, l: 7420, c: 7502 }
    ]
};

const positions = Z.buildPositions(Z.pickRows(fixture));
const byId = Object.fromEntries(positions.map(p => [p.id, p]));

test('pickRows parses totals with thousands separators and two-digit expirations', () => {
    const rows = Z.pickRows(fixture);
    const evening = rows.find(r => r.o === 'F');
    assert.strictEqual(evening.v, -1250);
    assert.strictEqual(evening.e, '2026-11-10');
    assert.strictEqual(evening.p, 'C');
    assert.strictEqual(rows.some(r => r.s === 'Assignment' || r.s === 'Exercise'), false);
});

test('only positions opened on their expiration day in ET count as 0DTE', () => {
    assert.deepStrictEqual(positions.map(p => p.id).sort(), ['B', 'C', 'D']);
});

test('a close matches the oldest lot first, even when that lot is not 0DTE', () => {
    const b = byId.B;
    assert.strictEqual(b.structure, 'Call credit spread');
    assert.strictEqual(b.outcome, 'Expired');
    assert.strictEqual(b.pl, 100);
});

test('cash settlements count toward P&L and mark the position settled', () => {
    const c = byId.C;
    assert.strictEqual(c.structure, 'Iron condor');
    assert.strictEqual(c.outcome, 'Settled ITM');
    assert.strictEqual(c.pl, -150);
    assert.strictEqual(c.shortPut, 7400);
    assert.strictEqual(c.shortCall, 7500);
    assert.strictEqual(c.credit, true);
});

test('structures are named from their legs', () => {
    const leg = (strike, type, side, qty = 1) => ({ symbol: `${strike}${type}${side}`, strike, type, side, qty });
    assert.strictEqual(Z.nameStructure([leg(7450, 'P', 'short'), leg(7440, 'P', 'long')], 100), 'Put credit spread');
    assert.strictEqual(Z.nameStructure([leg(7450, 'P', 'short'), leg(7460, 'P', 'long')], -100), 'Put debit spread');
    assert.strictEqual(Z.nameStructure([leg(7440, 'P', 'long'), leg(7450, 'P', 'short'), leg(7450, 'C', 'short'), leg(7460, 'C', 'long')], 900), 'Iron butterfly');
    assert.strictEqual(Z.nameStructure([leg(7440, 'C', 'long'), leg(7450, 'C', 'short', 2), leg(7460, 'C', 'long')], -80), 'Call butterfly');
    assert.strictEqual(Z.nameStructure([leg(7400, 'P', 'long'), leg(7500, 'C', 'long')], -200), 'Long strangle');
    assert.strictEqual(Z.nameStructure([leg(7400, 'P', 'short')], 300), 'Short put');
    assert.strictEqual(Z.nameStructure([leg(7400, 'P', 'long'), leg(7410, 'P', 'short'), leg(7500, 'C', 'long')], -50), 'Mixed 3-leg (2 puts, 1 call)');
});

test('move buckets follow the skill boundaries', () => {
    assert.strictEqual(Z.bucketMove(0), 'up:lt03');
    assert.strictEqual(Z.bucketMove(0.29), 'up:lt03');
    assert.strictEqual(Z.bucketMove(0.3), 'up:03-05');
    assert.strictEqual(Z.bucketMove(0.5), 'up:03-05');
    assert.strictEqual(Z.bucketMove(0.6), 'up:05-06');
    assert.strictEqual(Z.bucketMove(0.99), 'up:06-1');
    assert.strictEqual(Z.bucketMove(1), 'up:1-15');
    assert.strictEqual(Z.bucketMove(-1.5), 'down:1-15');
    assert.strictEqual(Z.bucketMove(-1.51), 'down:gt15');
});

test('distance bands put the wrong side of the open first', () => {
    assert.strictEqual(Z.bandDistance(-0.1), 'wrong');
    assert.strictEqual(Z.bandDistance(0), '0-025');
    assert.strictEqual(Z.bandDistance(0.25), '025-05');
    assert.strictEqual(Z.bandDistance(0.99), '075-1');
    assert.strictEqual(Z.bandDistance(1), 'gte1');
});

test('measure uses the day bar for moves, distance, hit and ITM at close', () => {
    const m = Z.measure(positions, spx);
    assert.deepStrictEqual(m.missingDays, ['2026-11-04']);
    assert.deepStrictEqual(m.pending.map(p => p.id), ['B']);
    assert.strictEqual(m.positions.length, 1);

    const c = m.positions[0];
    assert.strictEqual(c.bucket.oc, 'up:06-1');
    assert.strictEqual(c.bucket.pc, 'up:lt03');
    assert.strictEqual(c.entry, 'am');
    assert.strictEqual(c.put.band, '05-075');
    assert.strictEqual(c.put.hit, false);
    assert.strictEqual(c.put.itm, false);
    assert.strictEqual(c.call.band, '05-075');
    assert.strictEqual(c.call.hit, true);
    assert.strictEqual(c.call.itm, true);

    const row = Z.byMoveBucket(m.positions, 'oc').find(r => r.key === 'up:06-1');
    assert.deepStrictEqual([row.trades, row.days, row.net, row.winRate], [1, 1, -150, 0]);
    const band = Z.byDistance(m.positions, 'call').find(r => r.key === '05-075');
    assert.deepStrictEqual([band.trades, band.hitPct, band.itmPct], [1, 100, 100]);
});

test('SPX status counts trading days the cache is behind', () => {
    const st = SpxData.status(spx, new Date('2026-11-13T22:00:00Z'));
    assert.strictEqual(st.lastDate, '2026-11-06');
    assert.strictEqual(st.expected, '2026-11-13');
    assert.strictEqual(st.behind, 5);
    assert.strictEqual(st.current, false);
    assert.strictEqual(SpxData.status({ bars: [{ d: '2026-11-13' }] }, new Date('2026-11-14T18:00:00Z')).current, true);
});
