class ZeroDtePanel {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.rows = [];
        this.positions = [];
        this.spx = null;
        this.spxError = null;
        this.vixData = null;
        this.vix = new Map();
        this.openMenu = null;
        this.state = ZeroDtePanel.defaultState();
    }

    static defaultState() {
        return { measure: 'oc', entry: 'all', side: 'put', bucket: null, distance: null, structure: [], outcome: [], day: null };
    }

    initialize() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`ZeroDtePanel container "${this.containerId}" not found`);
            return;
        }
        this.container.addEventListener('click', e => this.handleClick(e));
        this.container.addEventListener('keydown', e => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-action]')) {
                e.preventDefault();
                this.handleClick(e);
            }
        });
        this.container.addEventListener('change', e => {
            const key = e.target.dataset.multi;
            if (!key) return;
            const value = e.target.value;
            const list = this.state[key].filter(v => v !== value);
            if (e.target.checked) list.push(value);
            this.state[key] = list;
            this.render();
        });
        this.container.addEventListener('toggle', e => {
            if (!e.target.matches('details[data-menu]')) return;
            if (e.target.open) this.openMenu = e.target.dataset.menu;
            else if (this.openMenu === e.target.dataset.menu) this.openMenu = null;
        }, true);
        document.addEventListener('click', e => {
            if (!this.openMenu || e.target.closest(`details[data-menu="${this.openMenu}"]`)) return;
            this.closeMenu();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && this.openMenu) this.closeMenu();
        });
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(entries => {
                const width = Math.round(entries[0].contentRect.width);
                if (width && width !== this.ladderWidth) this.drawLadder();
            });
        }
        this.render();
        SpxData.load()
            .then(data => { this.spx = data; })
            .catch(err => { this.spxError = err; })
            .finally(() => this.render());
        SpxData.loadVix()
            .then(data => {
                this.vixData = data;
                this.vix = SpxData.indexVix(data);
                this.render();
            })
            .catch(err => console.warn('VIX data could not be loaded:', err));
    }

    closeMenu() {
        const menu = this.container.querySelector(`details[data-menu="${this.openMenu}"]`);
        this.openMenu = null;
        if (menu) menu.open = false;
    }

    update(rows) {
        if (rows === this.rows) return;
        this.rows = rows || [];
        this.positions = ZeroDteAnalytics.buildPositions(this.rows);
        this.state = ZeroDtePanel.defaultState();
        this.render();
    }

    handleClick(e) {
        const el = e.target.closest('[data-action]');
        if (!el || !this.container.contains(el)) return;
        const { action, value } = el.dataset;
        const s = this.state;
        if (action === 'measure' || action === 'entry' || action === 'side') {
            if (action === 'side' && s.side !== value) s.distance = null;
            if (action === 'measure' && s.measure !== value) s.bucket = null;
            s[action] = value;
        } else if (action === 'bucket') {
            s.bucket = s.bucket === value ? null : value;
        } else if (action === 'distance') {
            s.distance = s.distance === value ? null : value;
        } else if (action === 'clear') {
            if (el.dataset.item !== undefined) s[value] = s[value].filter(v => v !== el.dataset.item);
            else s[value] = ZeroDtePanel.defaultState()[value];
        } else if (action === 'multi-all') {
            s[value] = [];
        } else if (action === 'day') {
            s.day = value;
        } else {
            return;
        }
        this.render();
    }

    filtered(except) {
        const s = this.state;
        return this.measured.positions.filter(p =>
            (except === 'entry' || s.entry === 'all' || p.entry === s.entry)
            && (except === 'bucket' || !s.bucket || p.bucket[s.measure] === s.bucket)
            && (except === 'distance' || !s.distance || (p[s.side] && p[s.side].band === s.distance))
            && (!s.structure.length || s.structure.includes(p.structure))
            && (!s.outcome.length || s.outcome.includes(p.outcome)));
    }

    render() {
        if (!this.container) return;
        if (!this.rows.length) {
            this.container.innerHTML = `<div class="zd-empty"><p>This view needs a tastytrade transactions export that includes SPX options. Upload one to line up your 0DTE trades against each day's SPX move.</p></div>`;
            return;
        }
        if (this.spxError) {
            this.container.innerHTML = `<div class="zd-banner zd-banner-warn" role="status">SPX daily data could not be loaded (${ZeroDtePanel.esc(this.spxError.message)}). This view needs it to measure each day's move.</div>`;
            return;
        }
        if (!this.spx) {
            this.container.innerHTML = `<div class="zd-banner" role="status">Loading SPX daily data…</div>`;
            return;
        }

        this.measured = ZeroDteAnalytics.measure(this.positions, this.spx);
        if (!this.measured.positions.length && !this.measured.pending.length) {
            this.container.innerHTML = `${this.bannerHtml()}<div class="zd-empty"><p>No SPX 0DTE trades found in this export. A 0DTE trade here is an SPX option position opened on its expiration day.</p></div>`;
            return;
        }

        const all = this.filtered();
        this.container.innerHTML = `
            ${this.bannerHtml()}
            ${this.headlineHtml(all)}
            ${this.chipsHtml()}
            ${this.dayTypeHtml(this.filtered('bucket'))}
            ${this.distanceHtml(this.filtered('distance'))}
            ${this.explorerHtml(all)}
            ${this.footerHtml()}`;

        const ladder = this.container.querySelector('.zd-ladder');
        if (ladder && this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver.observe(ladder);
        }
        this.drawLadder();
    }

    bannerHtml() {
        const st = SpxData.status(this.spx);
        const pending = this.measured.pending.length;
        const through = `SPX data through ${ZeroDtePanel.longDate(st.lastDate)}`;
        const vixLast = this.vixData?.bars?.at(-1)?.d;
        const left = (pending
            ? ` ${pending} trade${pending === 1 ? '' : 's'} after that date ${pending === 1 ? 'is' : 'are'} left out until the data catches up.`
            : '') + (vixLast && vixLast !== st.lastDate ? ` VIX data through ${ZeroDtePanel.longDate(vixLast)}.` : '');
        if (st.current) {
            return `<div class="zd-banner" role="status"><span class="zd-dot zd-dot-ok" aria-hidden="true"></span>${through} · current.${left}</div>`;
        }
        return `<div class="zd-banner zd-banner-warn" role="status"><span class="zd-dot zd-dot-warn" aria-hidden="true"></span>${through} · ${st.behind} trading day${st.behind === 1 ? '' : 's'} behind.${left}</div>`;
    }

    headlineHtml(positions) {
        const t = ZeroDteAnalytics.totals(positions);
        const tile = (label, value, cls = '') => `<div class="zd-tile"><div class="zd-tile-label">${label}</div><div class="zd-tile-value ${cls}">${value}</div></div>`;
        return `
            <section class="report-card zd-card" aria-labelledby="zd-title">
                <div class="card-head">
                    <h2 id="zd-title" class="card-title">SPX 0DTE vs. day move</h2>
                    <p class="card-sub">Each 0DTE position from your export, lined up against how far SPX moved that day and how far its short strikes sat from the open.</p>
                </div>
                <div class="zd-tiles">
                    ${tile('Trades', t.trades)}
                    ${tile('Trading days', t.days)}
                    ${tile('Net P&amp;L', ZeroDtePanel.money(t.net), ZeroDtePanel.plClass(t.net))}
                    ${tile('Win rate', ZeroDtePanel.pctText(t.winRate))}
                </div>
                <p class="zd-summary">${this.summaryText()}</p>
            </section>`;
    }

    summaryText() {
        const positions = this.measured.positions;
        const t = ZeroDteAnalytics.totals(positions);
        const h = ZeroDteAnalytics.highlights(positions, this.state.measure);
        const measureName = this.state.measure === 'oc' ? 'open to close' : 'prior close to close';
        const parts = [`${t.trades} trades over ${t.days} trading days netted ${ZeroDtePanel.money(t.net)} after fees, winning ${ZeroDtePanel.pctText(t.winRate)} of closed trades.`];
        parts.push(h.losingBuckets.length
            ? `Measured ${measureName}, the day types that lost money were ${h.losingBuckets.map(b => `${b.label} (${ZeroDtePanel.money(b.net)})`).join(', ')}.`
            : `Measured ${measureName}, no day type lost money.`);
        const joinList = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
        const phrase = (rows, where) => {
            const bands = rows.filter(r => r.key !== 'wrong').map(r => r.label);
            const out = [];
            if (bands.length) out.push(`${joinList(bands)} ${where} the open`);
            if (rows.some(r => r.key === 'wrong')) out.push(bands.length ? 'on the wrong side of it' : 'on the wrong side of the open');
            return out.join(' or ');
        };
        const morning = [];
        if (h.morningPut.length) morning.push(`short puts ${phrase(h.morningPut, 'below')}`);
        if (h.morningCall.length) morning.push(`short calls ${phrase(h.morningCall, 'above')}`);
        parts.push(morning.length
            ? `For entries before 11:00 ET, ${morning.join(' and ')} won at least half the time and made money.`
            : 'No short strike distance both won half the time and made money for entries before 11:00 ET.');
        return parts.join(' ');
    }

    chipsHtml() {
        const s = this.state;
        const chips = [];
        const bucket = ZeroDteAnalytics.MOVE_BUCKETS.find(b => b.key === s.bucket);
        const band = ZeroDteAnalytics.DISTANCE_BANDS.find(b => b.key === s.distance);
        if (s.entry !== 'all') chips.push(['entry', s.entry === 'am' ? 'Entered before 11:00 ET' : 'Entered 11:00 ET or later']);
        if (bucket) chips.push(['bucket', `${bucket.label} ${s.measure === 'oc' ? 'open→close' : 'prior close→close'}`]);
        if (band) chips.push(['distance', `Short ${s.side} ${band.label}`]);
        s.structure.forEach(v => chips.push(['structure', v, v]));
        s.outcome.forEach(v => chips.push(['outcome', v, v]));
        if (!chips.length) return '';
        return `<div class="zd-chips" aria-label="Applied filters">${chips.map(([key, label, item]) =>
            `<button class="zd-chip" data-action="clear" data-value="${key}"${item !== undefined ? ` data-item="${ZeroDtePanel.esc(item)}"` : ''} aria-label="Remove filter ${ZeroDtePanel.esc(label)}">${ZeroDtePanel.esc(label)}<span aria-hidden="true">×</span></button>`).join('')}</div>`;
    }

    toggleHtml(action, options, current, label) {
        return `<div class="filter-button-group" role="radiogroup" aria-label="${label}">${options.map(([value, text]) =>
            `<button class="filter-btn${value === current ? ' active' : ''}" data-action="${action}" data-value="${value}" role="radio" aria-checked="${value === current}">${text}</button>`).join('')}</div>`;
    }

    barHtml(value, max) {
        const width = max ? Math.min(50, Math.abs(value) / max * 50) : 0;
        const side = value >= 0 ? `left:50%` : `right:50%`;
        return `<div class="zd-bar" aria-hidden="true"><span class="zd-bar-zero"></span><span class="zd-bar-fill ${ZeroDtePanel.plClass(value)}" style="${side};width:${width}%"></span></div>`;
    }

    dayTypeHtml(positions) {
        const s = this.state;
        const rows = ZeroDteAnalytics.byMoveBucket(positions, s.measure);
        const max = Math.max(0, ...rows.map(r => Math.abs(r.net)));
        const body = rows.map(r => `
            <tr data-action="bucket" data-value="${r.key}" tabindex="0" aria-pressed="${s.bucket === r.key}"
                class="zd-row${s.bucket === r.key ? ' zd-row-active' : ''}${r.trades ? '' : ' zd-row-empty'}${r.key === 'down:lt03' ? ' zd-row-split' : ''}">
                <td>${r.label}</td>
                <td class="zd-num">${r.trades} · ${r.days}</td>
                <td class="zd-num">${ZeroDtePanel.pctText(r.winRate)}</td>
                <td class="zd-bar-cell">${this.barHtml(r.net, max)}</td>
                <td class="zd-num ${ZeroDtePanel.plClass(r.net)}">${r.trades ? ZeroDtePanel.money(r.net) : '–'}</td>
            </tr>`).join('');
        return `
            <section class="report-card zd-card" aria-labelledby="zd-daytype-title">
                <div class="card-head card-head-row">
                    <div>
                        <h3 id="zd-daytype-title" class="card-title">Results by day type</h3>
                        <p class="card-sub">How far SPX moved that day. Tap a row to filter the rest of the page.</p>
                    </div>
                </div>
                <div class="zd-controls">
                    ${this.toggleHtml('measure', [['oc', 'Open → close'], ['pc', 'Prior close → close']], s.measure, 'Day move measure')}
                    ${this.toggleHtml('entry', [['all', 'Any entry'], ['am', 'Before 11:00 ET'], ['pm', '11:00 ET or later']], s.entry, 'Entry time')}
                </div>
                <div class="zd-table-wrap">
                    <table class="data-table zd-table">
                        <thead><tr><th>Day move</th><th class="zd-num" title="Trades · trading days">Trades · days</th><th class="zd-num">Win %</th><th class="zd-bar-cell"><span class="zd-sr">Net P&amp;L bar</span></th><th class="zd-num">Net P&amp;L</th></tr></thead>
                        <tbody>${body}</tbody>
                    </table>
                </div>
            </section>`;
    }

    distanceHtml(positions) {
        const s = this.state;
        const rows = ZeroDteAnalytics.byDistance(positions, s.side);
        const max = Math.max(0, ...rows.map(r => Math.abs(r.net)));
        const sideWord = s.side === 'put' ? 'below' : 'above';
        const body = rows.map(r => `
            <tr data-action="distance" data-value="${r.key}" tabindex="0" aria-pressed="${s.distance === r.key}"
                class="zd-row${s.distance === r.key ? ' zd-row-active' : ''}${r.trades ? '' : ' zd-row-empty'}">
                <td>${r.label}</td>
                <td class="zd-num">${r.trades}</td>
                <td class="zd-num">${ZeroDtePanel.pctText(r.hitPct)}</td>
                <td class="zd-num">${ZeroDtePanel.pctText(r.itmPct)}</td>
                <td class="zd-num">${ZeroDtePanel.pctText(r.winRate)}</td>
                <td class="zd-bar-cell zd-bar-col">${this.barHtml(r.net, max)}</td>
                <td class="zd-num ${ZeroDtePanel.plClass(r.net)}">${r.trades ? ZeroDtePanel.money(r.net) : '–'}</td>
            </tr>`).join('');
        return `
            <section class="report-card zd-card" aria-labelledby="zd-distance-title">
                <div class="card-head">
                    <h3 id="zd-distance-title" class="card-title">Short strike vs. open</h3>
                    <p class="card-sub">Credit structures only: iron condors, credit spreads and naked shorts. Distance is how far the nearest short ${s.side} sat ${sideWord} the day's open. Hit means the day's ${s.side === 'put' ? 'low' : 'high'} reached it.</p>
                </div>
                <div class="zd-controls">
                    ${this.toggleHtml('side', [['put', 'Short puts'], ['call', 'Short calls']], s.side, 'Short strike side')}
                </div>
                <div class="zd-table-wrap">
                    <table class="data-table zd-table">
                        <thead><tr><th>Distance</th><th class="zd-num">Trades</th><th class="zd-num">Hit %</th><th class="zd-num" title="Finished on the wrong side of the strike">ITM at close</th><th class="zd-num">Win %</th><th class="zd-bar-cell zd-bar-col"><span class="zd-sr">Net P&amp;L bar</span></th><th class="zd-num">Net P&amp;L</th></tr></thead>
                        <tbody>${body}</tbody>
                    </table>
                </div>
            </section>`;
    }

    explorerHtml(positions) {
        const s = this.state;
        const days = ZeroDteAnalytics.byDay(positions, s.measure);
        if (!days.some(d => d.date === s.day)) s.day = days.length ? days[days.length - 1].date : null;
        this.days = days;
        const index = days.findIndex(d => d.date === s.day);
        const day = days[index];

        const structures = ZeroDteAnalytics.structures(this.measured.positions);
        const list = [...days].reverse().map(d => {
            const vix = this.vix.get(d.date);
            return `
            <button class="zd-day${d.date === s.day ? ' active' : ''}" data-action="day" data-value="${d.date}" aria-pressed="${d.date === s.day}">
                <span class="zd-day-date">${ZeroDtePanel.shortDate(d.date)}</span>
                <span class="zd-day-move">${ZeroDtePanel.signedPct(d.move)}${vix ? ` · VIX ${vix.c.toFixed(2)}` : ''}</span>
                <span class="zd-day-pl ${ZeroDtePanel.plClass(d.pl)}">${ZeroDtePanel.money(d.pl)}</span>
            </button>`;
        }).join('');

        return `
            <section class="report-card zd-card" aria-labelledby="zd-explorer-title">
                <div class="card-head">
                    <h3 id="zd-explorer-title" class="card-title">Day explorer</h3>
                    <p class="card-sub">Pick a day to see its range against your strikes. Filled dots are short strikes, hollow dots are long.</p>
                </div>
                <div class="zd-controls">
                    ${this.multiSelectHtml('structure', 'Structure', 'structures', structures)}
                    ${this.multiSelectHtml('outcome', 'Outcome', 'outcomes', ZeroDteAnalytics.OUTCOMES)}
                </div>
                ${days.length ? `
                <div class="zd-explorer">
                    <div class="zd-days" aria-label="Trading days">${list}</div>
                    <div class="zd-day-detail">
                        <div class="zd-day-head">
                            <div>
                                <div class="zd-day-title">${ZeroDtePanel.longDate(day.date)}</div>
                                <div class="card-sub">Open ${ZeroDtePanel.price(day.bar.o)} · close ${ZeroDtePanel.price(day.bar.c)} · ${ZeroDtePanel.signedPct(day.move)} ${s.measure === 'oc' ? 'open→close' : 'prior close→close'} · range ${ZeroDtePanel.price(day.bar.l)}–${ZeroDtePanel.price(day.bar.h)}</div>
                                <div class="card-sub">${this.vixLine(day.date)}</div>
                            </div>
                            <div class="zd-pager">
                                <button class="filter-btn" data-action="day" data-value="${days[index - 1]?.date ?? ''}" ${index > 0 ? '' : 'disabled'}>‹ Prev</button>
                                <button class="filter-btn" data-action="day" data-value="${days[index + 1]?.date ?? ''}" ${index < days.length - 1 ? '' : 'disabled'}>Next ›</button>
                            </div>
                        </div>
                        <div class="zd-ladder"></div>
                        <div class="zd-table-wrap">${this.dayTradesHtml(day)}</div>
                    </div>
                </div>` : `<p class="zd-empty-inline">No trades match these filters.</p>`}
            </section>`;
    }

    multiSelectHtml(key, label, plural, options) {
        const selected = this.state[key];
        const summary = !selected.length ? `All ${plural}` : (selected.length === 1 ? selected[0] : `${selected.length} ${plural}`);
        return `
            <div class="zd-select-label">${label}
                <details class="zd-multi" data-menu="${key}"${this.openMenu === key ? ' open' : ''}>
                    <summary class="research-select">${ZeroDtePanel.esc(summary)}</summary>
                    <div class="zd-multi-panel">
                        <button class="zd-multi-all${selected.length ? '' : ' active'}" data-action="multi-all" data-value="${key}">All ${plural}</button>
                        ${options.map(v => `
                        <label class="zd-multi-option">
                            <input type="checkbox" data-multi="${key}" value="${ZeroDtePanel.esc(v)}"${selected.includes(v) ? ' checked' : ''}>
                            <span>${ZeroDtePanel.esc(v)}</span>
                        </label>`).join('')}
                    </div>
                </details>
            </div>`;
    }

    vixLine(date) {
        const vix = this.vix.get(date);
        if (!vix) return 'VIX n/a';
        const change = vix.c - vix.o;
        return `VIX open ${vix.o.toFixed(2)} · close ${vix.c.toFixed(2)} <span class="${ZeroDtePanel.plClass(-change)}">(${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(2)})</span>`;
    }

    dayTradesHtml(day) {
        const rows = day.positions.map(p => `
            <tr>
                <td>${ZeroDtePanel.etTime(p.entryMinutes)}</td>
                <td>${ZeroDtePanel.esc(p.structure)}</td>
                <td class="zd-legs">${ZeroDtePanel.legsText(p.legs)}</td>
                <td>${p.outcome}</td>
                <td class="zd-num ${ZeroDtePanel.plClass(p.pl)}">${ZeroDtePanel.money(p.pl, 2)}</td>
            </tr>`).join('');
        return `<table class="data-table zd-table"><thead><tr><th>Entry ET</th><th>Structure</th><th>Legs</th><th>Outcome</th><th class="zd-num">P&amp;L</th></tr></thead><tbody>${rows}</tbody></table>`;
    }

    drawLadder() {
        const el = this.container && this.container.querySelector('.zd-ladder');
        const day = this.days && this.days.find(d => d.date === this.state.day);
        if (!el || !day) return;
        const width = Math.round(el.clientWidth);
        this.ladderWidth = width;
        if (!width) return;

        const narrow = width < 520;
        const labelW = narrow ? 52 : 150;
        const rowH = 30;
        const top = 52;
        const bottom = 28;
        const right = 16;
        const positions = day.positions;
        const height = top + positions.length * rowH + bottom;
        const bar = day.bar;
        const strikes = positions.flatMap(p => p.legs.map(l => l.strike));
        let lo = Math.min(bar.l, bar.prev, ...strikes);
        let hi = Math.max(bar.h, bar.prev, ...strikes);
        const pad = Math.max(5, (hi - lo) * 0.06);
        lo -= pad;
        hi += pad;
        const x = v => labelW + (v - lo) / (hi - lo) * (width - labelW - right);
        const plotBottom = top + positions.length * rowH;

        const span = hi - lo;
        const step = [5, 10, 25, 50, 100, 200, 250, 500].find(s => span / s <= (narrow ? 4 : 8)) || 1000;
        const ticks = [];
        for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);

        const ref = (value, cls, label, y) => {
            const px = x(value);
            const half = label.length * 3.2;
            const anchor = px + half > width - 2 ? 'end' : (px - half < labelW ? 'start' : 'middle');
            return `
            <line class="${cls}" x1="${px}" x2="${px}" y1="${top - 6}" y2="${plotBottom}"></line>
            <text class="zd-ref-label" x="${px}" y="${y}" text-anchor="${anchor}">${label}</text>`;
        };

        const rows = positions.map((p, i) => {
            const y = top + i * rowH + rowH / 2;
            const cls = p.outcome === 'Open' ? 'zd-open' : (p.pl > 0 ? 'zd-win' : 'zd-loss');
            const ks = p.legs.map(l => l.strike);
            const tip = `${ZeroDtePanel.etTime(p.entryMinutes)} ET · ${p.structure} · ${ZeroDtePanel.legsText(p.legs)} · ${p.outcome} · ${ZeroDtePanel.money(p.pl, 2)}`;
            const label = narrow ? ZeroDtePanel.etTime(p.entryMinutes) : `${ZeroDtePanel.etTime(p.entryMinutes)} ${p.structure}`;
            return `
                <g class="zd-ladder-row ${cls}">
                    <title>${ZeroDtePanel.esc(tip)}</title>
                    <rect class="zd-hit" x="0" y="${y - rowH / 2}" width="${width}" height="${rowH}"></rect>
                    <text class="zd-row-label" x="4" y="${y + 4}">${ZeroDtePanel.esc(ZeroDtePanel.clip(label, narrow ? 8 : 22))}</text>
                    <line class="zd-span" x1="${x(Math.min(...ks))}" x2="${x(Math.max(...ks))}" y1="${y}" y2="${y}"></line>
                    ${p.legs.map(l => `<circle class="zd-leg ${l.side}" cx="${x(l.strike)}" cy="${y}" r="5"></circle>`).join('')}
                </g>`;
        }).join('');

        el.innerHTML = `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Price ladder for ${ZeroDtePanel.longDate(day.date)}">
                <rect class="zd-range" x="${x(bar.l)}" y="${top - 6}" width="${Math.max(1, x(bar.h) - x(bar.l))}" height="${plotBottom - top + 6}"><title>Day range ${ZeroDtePanel.price(bar.l)}–${ZeroDtePanel.price(bar.h)}</title></rect>
                ${ticks.map(t => `<line class="zd-grid" x1="${x(t)}" x2="${x(t)}" y1="${top - 6}" y2="${plotBottom}"></line><text class="zd-tick" x="${x(t)}" y="${plotBottom + 18}" text-anchor="middle">${t.toLocaleString('en-US')}</text>`).join('')}
                ${ref(bar.prev, 'zd-prev', `Prior ${ZeroDtePanel.price(bar.prev)}`, 12)}
                ${ref(bar.o, 'zd-openline', `Open ${ZeroDtePanel.price(bar.o)}`, 26)}
                ${ref(bar.c, 'zd-closeline', `Close ${ZeroDtePanel.price(bar.c)}`, 40)}
                ${rows}
            </svg>`;
    }

    footerHtml() {
        const missing = this.measured.missingDays;
        return `
            <footer class="zd-footer">
                <p><strong>Sources.</strong> SPX daily open, high, low and close from Yahoo Finance (^GSPC), and VIX open and close (^VIX), cached with this site and refreshed each weekday after the close. Trades come from your tastytrade export and never leave this browser.</p>
                <p><strong>0DTE.</strong> An SPX option position opened on its expiration day, in Eastern time. Positions opened on an earlier day, including the evening before in the overnight session, are left out. Closes are matched to opening lots first in, first out, and P&amp;L includes fees.</p>
                ${missing.length ? `<p><strong>Days left out.</strong> No published SPX bar for ${missing.map(ZeroDtePanel.longDate).join(', ')}.</p>` : ''}
                <p><strong>Caveat.</strong> Strike distances use the day's open because the export doesn't record SPX at the moment of entry. For afternoon entries the open can be far from where SPX actually was.</p>
            </footer>`;
    }

    static esc(value) {
        return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    static clip(text, n) {
        return text.length > n ? `${text.slice(0, n - 1)}…` : text;
    }

    static money(value, digits = 0) {
        const abs = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
        if (Math.abs(value) < (digits ? 0.005 : 0.5)) return `$${abs}`;
        return `${value > 0 ? '+' : '−'}$${abs}`;
    }

    static plClass(value) {
        if (value > 0) return 'zd-pos';
        if (value < 0) return 'zd-neg';
        return '';
    }

    static pctText(value) {
        return value === null || value === undefined ? '–' : `${Math.round(value)}%`;
    }

    static signedPct(value) {
        return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}%`;
    }

    static price(value) {
        return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    static etTime(minutes) {
        const h = Math.floor(minutes / 60);
        return `${h % 12 || 12}:${String(minutes % 60).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`;
    }

    static legsText(legs) {
        return legs.map(l => `${l.side === 'short' ? '−' : '+'}${l.qty > 1 ? `${l.qty}×` : ''}${l.strike}${l.type}`).join(' ');
    }

    static parseIso(iso) {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d));
    }

    static shortDate(iso) {
        return ZeroDtePanel.parseIso(iso).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
    }

    static longDate(iso) {
        return ZeroDtePanel.parseIso(iso).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
    }
}

if (typeof window !== 'undefined') {
    window.ZeroDtePanel = ZeroDtePanel;
}
