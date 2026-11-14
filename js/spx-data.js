const SpxData = (() => {
    const URL = 'data/spx-daily.json';
    let request = null;

    function load() {
        if (!request) {
            request = fetch(URL, { cache: 'no-cache' })
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                })
                .catch(err => {
                    request = null;
                    throw err;
                });
        }
        return request;
    }

    function status(data, now = new Date()) {
        const lastDate = data.bars.length ? data.bars[data.bars.length - 1].d : null;
        const expected = MarketCalendar.lastCompletedTradingDay(now);
        const behind = lastDate && lastDate < expected
            ? MarketCalendar.tradingDaysBetween(MarketCalendar.addDays(lastDate, 1), expected).length
            : 0;
        return { firstDate: data.bars[0]?.d ?? null, lastDate, expected, behind, current: behind === 0 };
    }

    return { load, status };
})();
