#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const calendarSrc = readFileSync(join(repoRoot, 'js/market-calendar.js'), 'utf8');
const Cal = new Function(`${calendarSrc}\nreturn MarketCalendar;`)();

const OUT = join(repoRoot, 'data/spx-daily.json');
const SOURCE = 'Yahoo Finance ^GSPC daily chart';
const SEED_START = `${Cal.FIRST_YEAR}-01-02`;

function parseArgs(argv) {
    const args = {};
    for (const arg of argv) {
        if (arg === '--backfill') args.backfill = true;
        else throw new Error(`Unknown argument ${arg}`);
    }
    return args;
}

const round2 = n => Math.round(n * 100) / 100;

async function fetchBars(start, end) {
    const period1 = Math.floor(Date.parse(`${start}T00:00:00Z`) / 1000);
    const period2 = Math.floor(Date.parse(`${Cal.addDays(end, 1)}T00:00:00Z`) / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?period1=${period1}&period2=${period2}&interval=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (option-insights data refresh)' } });
    if (!res.ok) throw new Error(`Yahoo returned HTTP ${res.status}`);
    const body = await res.json();
    const result = body?.chart?.result?.[0];
    if (!result) throw new Error(`Yahoo returned no chart result: ${JSON.stringify(body?.chart?.error)}`);

    const q = result.indicators?.quote?.[0] ?? {};
    const bars = (result.timestamp ?? []).map((t, i) => ({
        d: Cal.etDate(new Date(t * 1000)),
        o: q.open?.[i], h: q.high?.[i], l: q.low?.[i], c: q.close?.[i]
    })).filter(b => b.d >= start && b.d <= end);

    for (const b of bars) {
        if (![b.o, b.h, b.l, b.c].every(Number.isFinite)) {
            throw new Error(`Incomplete bar for ${b.d}: ${JSON.stringify(b)}`);
        }
        Object.assign(b, { o: round2(b.o), h: round2(b.h), l: round2(b.l), c: round2(b.c) });
        if (b.l > Math.min(b.o, b.c) || b.h < Math.max(b.o, b.c)) {
            throw new Error(`Bar for ${b.d} has open/close outside its high/low: ${JSON.stringify(b)}`);
        }
    }
    return { bars, previousClose: result.meta?.chartPreviousClose };
}

function validate(data, end) {
    if (!data.bars.length) throw new Error('SPX data has no bars');
    const expected = Cal.tradingDaysBetween(data.bars[0].d, end);
    const have = new Set(data.bars.map(b => b.d));
    const missing = expected.filter(d => !have.has(d));
    const unexpected = data.bars.map(b => b.d).filter(d => !expected.includes(d));
    const problems = [];
    const firstExpected = Cal.tradingDaysBetween(SEED_START, end)[0];
    if (data.bars[0].d !== firstExpected) problems.push(`first bar is ${data.bars[0].d}, expected ${firstExpected}`);
    if (missing.length) problems.push(`missing trading days: ${missing.join(', ')}`);
    if (unexpected.length) problems.push(`bars on non-trading days: ${unexpected.join(', ')}`);
    if (!Number.isFinite(data.prevClose)) problems.push('prevClose is missing');
    if (problems.length) throw new Error(`SPX data failed validation: ${problems.join('; ')}`);
}

function serialize(data) {
    const rows = data.bars.map(b => `    ${JSON.stringify(b)}`).join(',\n');
    return `{\n  "source": ${JSON.stringify(data.source)},\n  "fetchedAt": ${JSON.stringify(data.fetchedAt)},\n  "prevClose": ${data.prevClose},\n  "bars": [\n${rows}\n  ]\n}\n`;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const end = Cal.lastCompletedTradingDay();
    const backfilling = args.backfill || !existsSync(OUT);

    let data;
    let start;
    if (backfilling) {
        start = SEED_START;
        data = { source: SOURCE, prevClose: null, bars: [] };
    } else {
        data = JSON.parse(readFileSync(OUT, 'utf8'));
        start = Cal.addDays(data.bars.at(-1).d, 1);
        if (start > end) {
            console.log(`SPX data already current through ${end}`);
            return;
        }
    }

    const fetched = await fetchBars(start, end);
    if (backfilling) data.prevClose = round2(fetched.previousClose);
    data.bars.push(...fetched.bars);
    validate(data, end);

    data.source = SOURCE;
    data.fetchedAt = new Date().toISOString();
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, serialize(data));
    console.log(`Wrote ${fetched.bars.length} new bar(s); SPX data now ${data.bars[0].d} to ${data.bars.at(-1).d} (${data.bars.length} days)`);
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});
