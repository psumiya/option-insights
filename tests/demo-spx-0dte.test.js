/**
 * Demo SPX 0DTE rows
 * The generator writes raw tastytrade rows, so they must survive both readers
 * an uploaded export goes through: the 0DTE analytics and the strategy mapper.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(repoRoot, f), 'utf8');
const { Z, Generator } = new Function(
    `${read('js/market-calendar.js')}\n${read('js/zero-dte-analytics.js')}\n${read('js/demo-data-generator.js')}
     return { Z: ZeroDteAnalytics, Generator: DemoDataGenerator };`
)();
const mapper = new Function(`${read('js/tasty-strategy-mapper.js')}\nreturn { convertTastyWithStrategyInference };`)();
const spx = JSON.parse(read('data/spx-daily.json'));

function seeded(seed) {
    let s = seed;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function generate(seed = 42) {
    return new Generator().generateSpx0dte(spx, { random: seeded(seed) });
}

function quiet(fn) {
    const log = console.log;
    console.log = () => {};
    try { return fn(); } finally { console.log = log; }
}

test('rows use the tastytrade export columns and formats', () => {
    const rows = generate();
    assert.ok(rows.length > 100);
    const header = 'Date,Type,Sub Type,Action,Symbol,Instrument Type,Description,Value,Quantity,Average Price,'
        + 'Commissions,Fees,Multiplier,Root Symbol,Underlying Symbol,Expiration Date,Strike Price,Call or Put,Order #,Total,Currency';
    header.split(',').forEach(col => assert.ok(col in rows[0], `missing ${col}`));

    rows.forEach(r => {
        assert.match(r.Date, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-0[78]00$/);
        assert.match(r.Symbol, /^SPXW {2}\d{6}[CP]\d{8}$/);
        assert.match(r['Expiration Date'], /^\d{2}\/\d{2}\/\d{2}$/);
        if (r.Type === 'Receive Deliver') {
            assert.strictEqual(r['Order #'], '');
            assert.strictEqual(r.Commissions, '--');
        }
    });
    for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].Date >= rows[i].Date, 'newest first');
});

test('every position opens on its expiration day and lands on a real SPX bar', () => {
    const positions = Z.buildPositions(Z.pickRows(generate()));
    const measured = Z.measure(positions, spx);
    assert.ok(positions.length >= 40);
    assert.strictEqual(measured.positions.length, positions.length);
    assert.ok(positions.every(p => p.outcome !== 'Open'), 'all demo days are complete');
    assert.ok(positions.some(p => p.structure === 'Iron condor'));
    assert.ok(new Set(positions.map(p => p.outcome)).size >= 3);
});

test('the strategy mapper and the 0DTE analytics agree on P&L', () => {
    const rows = generate(7);
    const positions = Z.buildPositions(Z.pickRows(rows));
    const trades = quiet(() => mapper.convertTastyWithStrategyInference(rows));
    assert.strictEqual(trades.length, positions.length);
    assert.ok(trades.every(t => t.Exit), 'no position left open');
    const net = list => Math.round(list.reduce((s, x) => s + x, 0));
    assert.strictEqual(net(trades.map(t => t.RealizedPL)), net(positions.map(p => p.pl)));
});
