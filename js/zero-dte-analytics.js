const ZeroDteAnalytics = (() => {
    const OPEN = new Set(['Sell to Open', 'Buy to Open']);
    const CLOSE = new Set(['Buy to Close', 'Sell to Close', 'Expiration', 'Cash Settled Exercise', 'Cash Settled Assignment']);
    const SETTLED = new Set(['Cash Settled Exercise', 'Cash Settled Assignment']);
    const CLOSE_SIDE = {
        'Buy to Close': 'short',
        'Cash Settled Assignment': 'short',
        'Sell to Close': 'long',
        'Cash Settled Exercise': 'long',
        'Expiration': null
    };
    const MORNING_CUTOFF_MINUTES = 11 * 60;

    const MOVE_BANDS = [
        { key: 'lt03', label: '<0.3%', test: a => a < 0.3 },
        { key: '03-05', label: '0.3–0.5%', test: a => a <= 0.5 },
        { key: '05-06', label: '0.5–0.6%', test: a => a <= 0.6 },
        { key: '06-1', label: '0.6–1%', test: a => a < 1 },
        { key: '1-15', label: '1–1.5%', test: a => a <= 1.5 },
        { key: 'gt15', label: '>1.5%', test: () => true }
    ];
    const MOVE_BUCKETS = [
        ...[...MOVE_BANDS].reverse().map(b => ({ key: `up:${b.key}`, label: `Up ${b.label}`, dir: 'up' })),
        ...MOVE_BANDS.map(b => ({ key: `down:${b.key}`, label: `Down ${b.label}`, dir: 'down' }))
    ];

    const DISTANCE_BANDS = [
        { key: 'wrong', label: 'Wrong side of open', test: d => d < 0 },
        { key: '0-025', label: '0–0.25%', test: d => d < 0.25 },
        { key: '025-05', label: '0.25–0.5%', test: d => d < 0.5 },
        { key: '05-075', label: '0.5–0.75%', test: d => d < 0.75 },
        { key: '075-1', label: '0.75–1%', test: d => d < 1 },
        { key: 'gte1', label: '≥1%', test: () => true }
    ];

    const CREDIT_STRUCTURES = new Set([
        'Iron condor', 'Put credit spread', 'Call credit spread', 'Short put', 'Short call'
    ]);

    const round2 = n => Math.round(n * 100) / 100;

    function num(value) {
        const n = parseFloat(String(value ?? '').replace(/,/g, ''));
        return Number.isFinite(n) ? n : 0;
    }

    function expIso(value) {
        const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(String(value || '').trim());
        if (!m) return null;
        const year = m[3].length === 2 ? `20${m[3]}` : m[3];
        return `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    }

    function pickRows(rawRows) {
        return rawRows
            .filter(r => r['Underlying Symbol'] === 'SPX'
                && /option/i.test(r['Instrument Type'] || '')
                && (OPEN.has(r['Sub Type']) || CLOSE.has(r['Sub Type'])))
            .map(r => ({
                t: r['Date'],
                s: r['Sub Type'],
                y: (r['Symbol'] || '').replace(/\s+/g, ' ').trim(),
                q: Math.abs(num(r['Quantity'])),
                v: num(r['Total']),
                e: expIso(r['Expiration Date']),
                k: num(r['Strike Price']),
                p: /^c/i.test(r['Call or Put'] || '') ? 'C' : 'P',
                o: r['Order #'] || ''
            }))
            .filter(r => r.e && r.q > 0 && !Number.isNaN(Date.parse(r.t)));
    }

    function sortRows(rows) {
        return rows
            .map((row, index) => ({ row, index, time: Date.parse(row.t) }))
            .sort((a, b) => a.time - b.time
                || Number(CLOSE.has(a.row.s)) - Number(CLOSE.has(b.row.s))
                || b.index - a.index)
            .map(x => x.row);
    }

    function mergeLegs(legs) {
        const merged = new Map();
        legs.forEach(leg => {
            const key = `${leg.symbol}|${leg.side}`;
            const existing = merged.get(key);
            if (existing) existing.qty += leg.qty;
            else merged.set(key, { ...leg });
        });
        return [...merged.values()].sort((a, b) => a.strike - b.strike || a.type.localeCompare(b.type));
    }

    function nameStructure(legs, openingTotal) {
        const credit = openingTotal > 0;
        const puts = legs.filter(l => l.type === 'P');
        const calls = legs.filter(l => l.type === 'C');
        const shorts = legs.filter(l => l.side === 'short');
        const longs = legs.filter(l => l.side === 'long');
        const oneOfEach = group => group.length === 2
            && group.some(l => l.side === 'short') && group.some(l => l.side === 'long');

        if (legs.length === 1) {
            return `${legs[0].side === 'short' ? 'Short' : 'Long'} ${legs[0].type === 'P' ? 'put' : 'call'}`;
        }
        if (legs.length === 2) {
            if (oneOfEach(puts)) return `Put ${credit ? 'credit' : 'debit'} spread`;
            if (oneOfEach(calls)) return `Call ${credit ? 'credit' : 'debit'} spread`;
            if (puts.length === 1 && calls.length === 1 && longs.length === 2) return 'Long strangle';
            if (puts.length === 1 && calls.length === 1 && shorts.length === 2) return 'Short strangle';
        }
        if (legs.length === 4 && oneOfEach(puts) && oneOfEach(calls)) {
            const shortPut = puts.find(l => l.side === 'short').strike;
            const shortCall = calls.find(l => l.side === 'short').strike;
            if (shortPut === shortCall) return credit ? 'Iron butterfly' : 'Reverse iron butterfly';
            return credit ? 'Iron condor' : 'Reverse iron condor';
        }
        if (legs.length === 3 && (puts.length === 3 || calls.length === 3)
            && shorts.length === 1 && longs.length === 2
            && longs[0].qty === longs[1].qty && shorts[0].qty === 2 * longs[0].qty) {
            return `${puts.length === 3 ? 'Put' : 'Call'} butterfly`;
        }
        const parts = [];
        if (puts.length) parts.push(`${puts.length} put${puts.length > 1 ? 's' : ''}`);
        if (calls.length) parts.push(`${calls.length} call${calls.length > 1 ? 's' : ''}`);
        return `Mixed ${legs.length}-leg (${parts.join(', ')})`;
    }

    function outcomeOf(pos) {
        if (pos.openQty > 1e-9) return 'Open';
        if ([...pos.closeKinds].some(k => SETTLED.has(k))) return 'Settled ITM';
        if (pos.closeKinds.size && [...pos.closeKinds].every(k => k === 'Expiration')) return 'Expired';
        return 'Closed early';
    }

    function buildPositions(rows) {
        const positions = new Map();
        const lots = new Map();

        sortRows(rows).forEach(row => {
            if (OPEN.has(row.s)) {
                const side = row.s === 'Sell to Open' ? 'short' : 'long';
                const et = MarketCalendar.toEt(new Date(row.t));
                let pos = null;
                if (et.date === row.e) {
                    const id = row.o || row.t;
                    pos = positions.get(id);
                    if (!pos) {
                        pos = {
                            id, date: row.e, time: row.t, entryMinutes: et.minutes,
                            rawLegs: [], openingTotal: 0, closingTotal: 0, openQty: 0, closeKinds: new Set()
                        };
                        positions.set(id, pos);
                    }
                    pos.rawLegs.push({ symbol: row.y, strike: row.k, type: row.p, side, qty: row.q });
                    pos.openingTotal += row.v;
                    pos.openQty += row.q;
                }
                if (!lots.has(row.y)) lots.set(row.y, []);
                lots.get(row.y).push({ pos, side, remaining: row.q });
                return;
            }

            const needed = CLOSE_SIDE[row.s];
            let remaining = row.q;
            for (const lot of lots.get(row.y) || []) {
                if (remaining <= 0) break;
                if (lot.remaining <= 0 || (needed && lot.side !== needed)) continue;
                const take = Math.min(lot.remaining, remaining);
                lot.remaining -= take;
                remaining -= take;
                if (lot.pos) {
                    lot.pos.closingTotal += row.v * take / row.q;
                    lot.pos.openQty -= take;
                    lot.pos.closeKinds.add(row.s);
                }
            }
        });

        return [...positions.values()]
            .map(pos => {
                const legs = mergeLegs(pos.rawLegs);
                const structure = nameStructure(legs, pos.openingTotal);
                const shortPuts = legs.filter(l => l.side === 'short' && l.type === 'P').map(l => l.strike);
                const shortCalls = legs.filter(l => l.side === 'short' && l.type === 'C').map(l => l.strike);
                return {
                    id: pos.id,
                    date: pos.date,
                    time: pos.time,
                    entryMinutes: pos.entryMinutes,
                    legs,
                    structure,
                    credit: CREDIT_STRUCTURES.has(structure),
                    openingTotal: round2(pos.openingTotal),
                    pl: round2(pos.openingTotal + pos.closingTotal),
                    outcome: outcomeOf(pos),
                    shortPut: shortPuts.length ? Math.max(...shortPuts) : null,
                    shortCall: shortCalls.length ? Math.min(...shortCalls) : null
                };
            })
            .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
    }

    function bucketMove(pct) {
        const band = MOVE_BANDS.find(b => b.test(Math.abs(pct)));
        return `${pct >= 0 ? 'up' : 'down'}:${band.key}`;
    }

    function bandDistance(pct) {
        return DISTANCE_BANDS.find(b => b.test(pct)).key;
    }

    function indexBars(spx) {
        const map = new Map();
        spx.bars.forEach((bar, i) => {
            map.set(bar.d, { ...bar, prev: i === 0 ? spx.prevClose : spx.bars[i - 1].c });
        });
        return map;
    }

    function measure(positions, spx) {
        const bars = indexBars(spx);
        const lastBar = spx.bars.length ? spx.bars[spx.bars.length - 1].d : '';
        const measured = [];
        const pending = [];
        const missing = new Set();

        positions.forEach(pos => {
            const bar = bars.get(pos.date);
            if (!bar) {
                if (pos.date > lastBar) pending.push(pos);
                else missing.add(pos.date);
                return;
            }
            const oc = (bar.c - bar.o) / bar.o * 100;
            const pc = (bar.c - bar.prev) / bar.prev * 100;
            const strike = (side) => {
                const k = side === 'put' ? pos.shortPut : pos.shortCall;
                if (!pos.credit || k === null) return null;
                const dist = side === 'put' ? (bar.o - k) / bar.o * 100 : (k - bar.o) / bar.o * 100;
                return {
                    strike: k,
                    dist,
                    band: bandDistance(dist),
                    hit: side === 'put' ? bar.l <= k : bar.h >= k,
                    itm: side === 'put' ? bar.c < k : bar.c > k
                };
            };
            measured.push({
                ...pos,
                bar,
                move: { oc, pc },
                bucket: { oc: bucketMove(oc), pc: bucketMove(pc) },
                entry: pos.entryMinutes < MORNING_CUTOFF_MINUTES ? 'am' : 'pm',
                put: strike('put'),
                call: strike('call')
            });
        });

        return { positions: measured, pending, missingDays: [...missing].sort() };
    }

    const isClosed = p => p.outcome !== 'Open';
    const isWin = p => p.pl > 0;
    const pct = (n, d) => (d ? n / d * 100 : null);

    function totals(positions) {
        const closed = positions.filter(isClosed);
        return {
            trades: positions.length,
            days: new Set(positions.map(p => p.date)).size,
            net: round2(positions.reduce((s, p) => s + p.pl, 0)),
            winRate: pct(closed.filter(isWin).length, closed.length)
        };
    }

    function byMoveBucket(positions, measureKey) {
        return MOVE_BUCKETS.map(bucket => {
            const rows = positions.filter(p => p.bucket[measureKey] === bucket.key);
            return { ...bucket, ...totals(rows) };
        });
    }

    function byDistance(positions, side) {
        return DISTANCE_BANDS.map(band => {
            const rows = positions.filter(p => p[side] && p[side].band === band.key);
            const t = totals(rows);
            return {
                key: band.key,
                label: band.label,
                trades: t.trades,
                hitPct: pct(rows.filter(p => p[side].hit).length, rows.length),
                itmPct: pct(rows.filter(p => p[side].itm).length, rows.length),
                winRate: t.winRate,
                net: t.net
            };
        });
    }

    function byDay(positions, measureKey) {
        const days = new Map();
        positions.forEach(p => {
            if (!days.has(p.date)) days.set(p.date, { date: p.date, move: p.move[measureKey], bar: p.bar, positions: [] });
            days.get(p.date).positions.push(p);
        });
        return [...days.values()]
            .map(d => ({ ...d, pl: round2(d.positions.reduce((s, p) => s + p.pl, 0)) }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    function highlights(positions, measureKey) {
        const losingBuckets = byMoveBucket(positions, measureKey).filter(b => b.trades && b.net < 0);
        const morning = positions.filter(p => p.entry === 'am');
        const winners = side => byDistance(morning, side).filter(b => b.trades && b.net > 0 && b.winRate !== null && b.winRate >= 50);
        return { losingBuckets, morningPut: winners('put'), morningCall: winners('call') };
    }

    function structures(positions) {
        return [...new Set(positions.map(p => p.structure))].sort();
    }

    return {
        MOVE_BUCKETS, DISTANCE_BANDS, OUTCOMES: ['Expired', 'Settled ITM', 'Closed early', 'Open'],
        pickRows, buildPositions, nameStructure, bucketMove, bandDistance,
        measure, totals, byMoveBucket, byDistance, byDay, highlights, structures
    };
})();
