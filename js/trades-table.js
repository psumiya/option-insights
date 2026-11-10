/**
 * Trades view
 * The reconstructed trades every chart is computed from, narrowed by the
 * same date, status, symbol and strategy filters as the report. Sortable by
 * any column, searchable by symbol or strategy, and paged so a large book
 * does not draw thousands of rows at once.
 */
class TradesTable {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }

    this.pageSize = options.pageSize || 100;
    this.trades = [];
    this.query = '';
    this.sort = { key: 'date', direction: 'desc' };
    this.visibleCount = this.pageSize;

    this.columns = [
      { key: 'symbol', label: 'Symbol', value: t => t.Symbol || '' },
      { key: 'strategy', label: 'Strategy', value: t => t.Strategy || '' },
      { key: 'entry', label: 'Entry', value: t => TradesTable.time(t.Entry) },
      { key: 'date', label: 'Exit', value: t => TradesTable.time(t.Exit) },
      { key: 'days', label: 'Days', numeric: true, value: t => t.DaysHeld },
      { key: 'credit', label: 'Credit', numeric: true, value: t => t.Credit },
      { key: 'debit', label: 'Debit', numeric: true, value: t => t.Debit },
      { key: 'fees', label: 'Fees', numeric: true, value: t => (Number(t.Commissions) || 0) + (Number(t.Fees) || 0) },
      { key: 'pl', label: 'Realized P/L', numeric: true, value: t => TradesTable.realized(t) }
    ];

    this._build();
  }

  /**
   * Realized P/L, matching the Snapshot KPI: every retired leg counts,
   * including legs closed inside a position that is still open. Null for an
   * open position with nothing realized yet.
   */
  static realized(trade) {
    const value = Number(trade.RealizedPL);
    if (trade.Result === 'Open') return value ? value : null;
    return Number.isFinite(value) ? value : Number(trade.ProfitLoss) || 0;
  }

  static time(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date) ? null : date.getTime();
  }

  static date(value) {
    if (value === null || value === undefined) return '';
    return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  static money(value, signed = false) {
    if (value === null || value === undefined || isNaN(value)) return '';
    const abs = Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (!signed) return `$${abs}`;
    return `${value >= 0 ? '+' : '-'}$${abs}`;
  }

  _build() {
    this.container.innerHTML = `
      <div class="trades-toolbar">
        <input type="search" class="trades-search" placeholder="Search symbol or strategy"
               aria-label="Search trades by symbol or strategy">
        <p class="trades-summary" aria-live="polite"></p>
      </div>
      <div class="trades-scroll">
        <table class="data-table trades-table">
          <thead><tr></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="trades-more"></div>
    `;

    this.searchInput = this.container.querySelector('.trades-search');
    this.summary = this.container.querySelector('.trades-summary');
    this.headRow = this.container.querySelector('thead tr');
    this.body = this.container.querySelector('tbody');
    this.more = this.container.querySelector('.trades-more');

    this.columns.forEach(column => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.dataset.key = column.key;
      if (column.numeric) th.className = 'num';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'trades-sort';
      button.textContent = column.label;
      button.addEventListener('click', () => this._sortBy(column.key));
      th.appendChild(button);
      this.headRow.appendChild(th);
    });

    this.searchInput.addEventListener('input', () => {
      this.query = this.searchInput.value.trim().toLowerCase();
      this.visibleCount = this.pageSize;
      this._render();
    });
  }

  /**
   * @param {Array} trades - Enriched trades after the report's filters
   */
  update(trades) {
    this.trades = trades || [];
    this.visibleCount = this.pageSize;
    this._render();
  }

  _sortBy(key) {
    const column = this.columns.find(c => c.key === key);
    if (this.sort.key === key) {
      this.sort.direction = this.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Text reads naturally A to Z; numbers and dates most useful largest first
      const isText = key === 'symbol' || key === 'strategy';
      this.sort = { key, direction: isText && !column.numeric ? 'asc' : 'desc' };
    }
    this._render();
  }

  _rows() {
    const query = this.query;
    const matched = query
      ? this.trades.filter(t =>
        String(t.Symbol || '').toLowerCase().includes(query)
        || String(t.Strategy || '').toLowerCase().includes(query))
      : this.trades.slice();

    const column = this.columns.find(c => c.key === this.sort.key);
    const direction = this.sort.direction === 'asc' ? 1 : -1;
    // Open trades sort by entry when ordering by exit, so they lead "most recent"
    const valueOf = column.key === 'date'
      ? t => TradesTable.time(t.Exit) ?? Number.MAX_SAFE_INTEGER
      : column.value;

    return matched.sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      const aMissing = va === null || va === undefined || va === '';
      const bMissing = vb === null || vb === undefined || vb === '';
      if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
      if (typeof va === 'string') return va.localeCompare(vb) * direction;
      return (va - vb) * direction;
    });
  }

  _render() {
    const rows = this._rows();
    const closed = rows.filter(t => t.Result !== 'Open');
    const net = rows.reduce((sum, t) => sum + (TradesTable.realized(t) || 0), 0);

    this.summary.replaceChildren();
    if (rows.length === 0) {
      this.summary.textContent = this.trades.length
        ? 'No trades match this search.'
        : 'No trades for the current filters.';
    } else {
      this.summary.append(
        `${rows.length} trade${rows.length === 1 ? '' : 's'}, ${closed.length} closed, realized `
      );
      const figure = document.createElement('span');
      figure.className = `trades-figure ${net >= 0 ? 'text-profit' : 'text-loss'}`;
      figure.textContent = TradesTable.money(net, true);
      this.summary.appendChild(figure);
    }

    this.headRow.querySelectorAll('th').forEach(th => {
      const active = th.dataset.key === this.sort.key;
      th.setAttribute('aria-sort', active ? (this.sort.direction === 'asc' ? 'ascending' : 'descending') : 'none');
      th.classList.toggle('sorted', active);
      th.classList.toggle('sorted-asc', active && this.sort.direction === 'asc');
    });

    const fragment = document.createDocumentFragment();
    rows.slice(0, this.visibleCount).forEach(trade => fragment.appendChild(this._row(trade)));
    this.body.replaceChildren(fragment);

    this.more.replaceChildren();
    const remaining = rows.length - this.visibleCount;
    if (remaining > 0) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-secondary';
      button.textContent = `Show ${Math.min(this.pageSize, remaining)} more of ${remaining}`;
      button.addEventListener('click', () => {
        this.visibleCount += this.pageSize;
        this._render();
      });
      this.more.appendChild(button);
    }
  }

  _row(trade) {
    const tr = document.createElement('tr');
    const cell = (text, className) => {
      const td = document.createElement('td');
      if (className) td.className = className;
      td.textContent = text;
      tr.appendChild(td);
      return td;
    };
    const selectable = (dimension, value) => {
      const td = document.createElement('td');
      if (value) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cell-select';
        button.dataset.select = dimension;
        button.dataset.value = value;
        button.title = `Filter the report to ${value}`;
        button.textContent = value;
        td.appendChild(button);
      }
      tr.appendChild(td);
    };

    selectable('symbol', trade.Symbol);
    selectable('strategy', trade.Strategy);
    cell(TradesTable.date(TradesTable.time(trade.Entry)));
    if (trade.Result === 'Open') {
      cell('Open', 'trades-open');
    } else {
      cell(TradesTable.date(TradesTable.time(trade.Exit)));
    }
    cell(trade.DaysHeld ?? '', 'num');
    cell(TradesTable.money(trade.Credit), 'num');
    cell(TradesTable.money(trade.Debit), 'num');
    cell(TradesTable.money((Number(trade.Commissions) || 0) + (Number(trade.Fees) || 0)), 'num');

    const realized = TradesTable.realized(trade);
    if (realized === null) {
      cell('Open', 'num trades-open');
    } else {
      const td = cell(TradesTable.money(realized, true), `num ${realized >= 0 ? 'text-profit' : 'text-loss'}`);
      if (trade.Result === 'Open') {
        // Legs already closed inside a position that is still open
        const tag = document.createElement('span');
        tag.className = 'trades-open trades-open-tag';
        tag.textContent = 'still open';
        td.prepend(tag);
        td.title = 'Realized from legs already closed; the position is still open';
      }
    }
    return tr;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TradesTable;
}
