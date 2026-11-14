const SpxData = (() => {
    const requests = {};

    function fetchJson(url) {
        if (!requests[url]) {
            requests[url] = fetch(url, { cache: 'no-cache' })
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                })
                .catch(err => {
                    delete requests[url];
                    throw err;
                });
        }
        return requests[url];
    }

    const load = () => fetchJson('data/spx-daily.json');
    const loadVix = () => fetchJson('data/vix-daily.json');

    function status(data, now = new Date()) {
        const lastDate = data.bars.length ? data.bars[data.bars.length - 1].d : null;
        const expected = MarketCalendar.lastCompletedTradingDay(now);
        const behind = lastDate && lastDate < expected
            ? MarketCalendar.tradingDaysBetween(MarketCalendar.addDays(lastDate, 1), expected).length
            : 0;
        return { firstDate: data.bars[0]?.d ?? null, lastDate, expected, behind, current: behind === 0 };
    }

    function indexVix(data) {
        const map = new Map();
        (data?.bars ?? []).forEach((bar, i) => {
            map.set(bar.d, { ...bar, prev: i === 0 ? data.prevClose : data.bars[i - 1].c });
        });
        return map;
    }

    return { load, loadVix, status, indexVix };
})();
