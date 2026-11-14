const MarketCalendar = (() => {
    const HOLIDAYS = new Set([
        '2025-01-01', '2025-01-09', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26',
        '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25',
        '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
        '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
        '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
        '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24'
    ]);
    const FIRST_YEAR = 2025;
    const LAST_YEAR = 2027;
    const CLOSE_CUTOFF_MINUTES = 16 * 60 + 15;
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

    const etParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });

    function assertIso(iso) {
        if (typeof iso !== 'string' || !ISO_DATE.test(iso)) {
            throw new Error(`Expected a YYYY-MM-DD date, got ${iso}`);
        }
    }

    function assertCovered(iso) {
        const year = Number(iso.slice(0, 4));
        if (year < FIRST_YEAR || year > LAST_YEAR) {
            throw new Error(`Market calendar covers ${FIRST_YEAR}-${LAST_YEAR}; add holidays for ${year}`);
        }
    }

    function addDays(iso, n) {
        assertIso(iso);
        const d = new Date(`${iso}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + n);
        return d.toISOString().slice(0, 10);
    }

    function isTradingDay(iso) {
        assertIso(iso);
        assertCovered(iso);
        const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
        return weekday !== 0 && weekday !== 6 && !HOLIDAYS.has(iso);
    }

    function previousTradingDay(iso) {
        let d = addDays(iso, -1);
        while (!isTradingDay(d)) d = addDays(d, -1);
        return d;
    }

    function tradingDaysBetween(startIso, endIso) {
        const days = [];
        for (let d = startIso; d <= endIso; d = addDays(d, 1)) {
            if (isTradingDay(d)) days.push(d);
        }
        return days;
    }

    function toEt(date) {
        const p = Object.fromEntries(etParts.formatToParts(date).map(x => [x.type, x.value]));
        return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
    }

    function etDate(date) {
        return toEt(date).date;
    }

    function lastCompletedTradingDay(now = new Date()) {
        const { date, minutes } = toEt(now);
        if (isTradingDay(date) && minutes >= CLOSE_CUTOFF_MINUTES) return date;
        return previousTradingDay(date);
    }

    return {
        FIRST_YEAR, LAST_YEAR,
        addDays, isTradingDay, previousTradingDay, tradingDaysBetween,
        etDate, toEt, lastCompletedTradingDay
    };
})();
