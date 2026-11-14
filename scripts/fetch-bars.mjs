#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const calendarSrc = readFileSync(join(repoRoot, 'js/market-calendar.js'), 'utf8');
const Cal = new Function(`${calendarSrc}\nreturn MarketCalendar;`)();

const SEED_START = `${Cal.FIRST_YEAR}-01-02`;
const SERIES = [
    { name: 'SPX', symbol: '^GSPC', out: 'data/spx-daily.json', strict: true },
    { name: 'VIX', symbol: '^VIX', out: 'data/vix-daily.json', strict: false }
];

function parseArgs(argv) {
    const args = {};
    for (const arg of argv) {
        if (arg === '--backfill') args.backfill = true;
        else throw new Error(`Unknown argument ${arg}`);
    }
    return args;
}

const round2 = n => Math.round(n * 100) / 100;

async function fetchBars(series, start, end, warn) {
    const period1 = Math.floor(Date.parse(`${Cal.addDays(start, -10)}T00:00:00Z`) / 1000);
    const period2 = Math.floor(Date.parse(`${Cal.addDays(end, 1)}T00:00:00Z`) / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(series.symbol)}?period1=${period1}&period2=${period2}&interval=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (option-insights data refresh)' } });
    if (!res.ok) throw new Error(`Yahoo returned HTTP ${res.status}`);
    const body = await res.json();
    const result = body?.chart?.result?.[0];
    if (!result) throw new Error(`Yahoo returned no chart result: ${JSON.stringify(body?.chart?.error)}`);

    const q = result.indicators?.quote?.[0] ?? {};
    const bars = [];
    let previousClose = null;
    (result.timestamp ?? []).forEach((t, i) => {
        const b = { d: Cal.etDate(new Date(t * 1000)), o: q.open?.[i], h: q.high?.[i], l: q.low?.[i], c: q.close?.[i] };
        if (b.d > end) return;
        if (b.d >= SEED_START.slice(0, 4) && !Cal.isTradingDay(b.d)) {
            if (b.d >= start && Number.isFinite(b.c)) warn(`Bar on market holiday ${b.d} skipped`);
            return;
        }
        if (b.d < start) {
            if (Number.isFinite(b.c)) previousClose = b.c;
            return;
        }
        const problem = ![b.o, b.h, b.l, b.c].every(Number.isFinite)
            ? 'is incomplete'
            : (b.l > Math.min(b.o, b.c) || b.h < Math.max(b.o, b.c) ? 'has open/close outside its high/low' : null);
        if (problem) {
            const msg = `Bar for ${b.d} ${problem}: ${JSON.stringify(b)}`;
            if (series.strict) throw new Error(msg);
            warn(`${msg}; skipped`);
            return;
        }
        bars.push({ d: b.d, o: round2(b.o), h: round2(b.h), l: round2(b.l), c: round2(b.c) });
    });
    return { bars, previousClose };
}

function validate(series, data, end, warn) {
    const problems = [];
    if (!data.bars.length) problems.push('no bars');
    else {
        const expected = Cal.tradingDaysBetween(data.bars[0].d, end);
        const have = new Set(data.bars.map(b => b.d));
        const missing = expected.filter(d => !have.has(d));
        const unexpected = data.bars.map(b => b.d).filter(d => !expected.includes(d));
        const firstExpected = Cal.tradingDaysBetween(SEED_START, end)[0];
        if (data.bars[0].d !== firstExpected) problems.push(`first bar is ${data.bars[0].d}, expected ${firstExpected}`);
        if (missing.length) problems.push(`missing trading days: ${missing.join(', ')}`);
        if (unexpected.length) problems.push(`bars on non-trading days: ${unexpected.join(', ')}`);
    }
    if (!Number.isFinite(data.prevClose)) problems.push('prevClose is missing');
    if (!problems.length) return;
    const msg = `${series.name} data failed validation: ${problems.join('; ')}`;
    if (series.strict) throw new Error(msg);
    warn(msg);
}

function serialize(data) {
    const rows = data.bars.map(b => `    ${JSON.stringify(b)}`).join(',\n');
    return `{\n  "source": ${JSON.stringify(data.source)},\n  "fetchedAt": ${JSON.stringify(data.fetchedAt)},\n  "prevClose": ${data.prevClose},\n  "bars": [\n${rows}\n  ]\n}\n`;
}

async function refresh(series, args, end) {
    const out = join(repoRoot, series.out);
    const warn = msg => console.warn(`${series.name} warning: ${msg}`);
    const backfilling = args.backfill || !existsSync(out);

    let data;
    let start;
    if (backfilling) {
        start = SEED_START;
        data = { prevClose: null, bars: [] };
    } else {
        data = JSON.parse(readFileSync(out, 'utf8'));
        start = Cal.addDays(data.bars.at(-1).d, 1);
        if (start > end) {
            console.log(`${series.name} data already current through ${end}`);
            return;
        }
    }

    const fetched = await fetchBars(series, start, end, warn);
    if (backfilling) data.prevClose = round2(fetched.previousClose);
    if (!fetched.bars.length && !backfilling) {
        validate(series, data, end, warn);
        console.log(`${series.name}: no new bars yet`);
        return;
    }
    data.bars.push(...fetched.bars);
    validate(series, data, end, warn);

    data.source = `Yahoo Finance ${series.symbol} daily chart`;
    data.fetchedAt = new Date().toISOString();
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, serialize(data));
    console.log(`${series.name}: wrote ${fetched.bars.length} new bar(s); data now ${data.bars[0].d} to ${data.bars.at(-1).d} (${data.bars.length} days)`);
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const end = Cal.lastCompletedTradingDay();
    let failed = false;
    for (const series of SERIES) {
        try {
            await refresh(series, args, end);
        } catch (err) {
            failed = true;
            console.error(`${series.name}: ${err.message}`);
        }
    }
    if (failed) process.exit(1);
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});
