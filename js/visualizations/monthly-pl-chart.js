/**
 * Monthly P/L Chart
 * One column per month for net realized P/L, signed around a zero baseline.
 * Hovering or focusing anywhere in a month's column shows that month's
 * strategy breakdown. The best, worst and latest months carry direct labels.
 */
class MonthlyPLChart {
  /**
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Object} options
   */
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }

    this.margin = { top: 28, right: 12, bottom: 36, left: 60 };
    this.options = {
      maxBarWidth: 24,
      cornerRadius: 4,
      breakdownRows: 6,
      ...options
    };
    this.data = [];

    this._initChart();
    this._setupResizeObserver();
  }

  _initChart() {
    this.container.innerHTML = '';

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('class', 'monthly-pl-svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('role', 'img');

    this.gridGroup = this.svg.append('g').attr('class', 'monthly-pl-grid');
    this.barsGroup = this.svg.append('g').attr('class', 'monthly-pl-bars');
    this.labelsGroup = this.svg.append('g').attr('class', 'monthly-pl-labels');
    this.axisGroup = this.svg.append('g').attr('class', 'monthly-pl-axis');
    this.hitGroup = this.svg.append('g').attr('class', 'monthly-pl-hits');

    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'monthly-pl-tooltip')
      .attr('role', 'status')
      .style('visibility', 'hidden');
  }

  _setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.data.length > 0) this._render();
    });
    this.resizeObserver.observe(this.container);
  }

  /**
   * @param {Array} data - [{ month, monthKey: 'YYYY-MM', strategies: [{ strategy, pl }] }]
   */
  update(data) {
    this.data = (data || []).map(month => {
      const strategies = [...month.strategies].sort((a, b) => b.pl - a.pl);
      return {
        monthKey: month.monthKey,
        strategies,
        net: strategies.reduce((sum, s) => sum + s.pl, 0)
      };
    });

    if (this.data.length === 0) {
      this._showEmptyState();
      return;
    }
    this._render();
  }

  _render() {
    const { width, height } = this.container.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const colors = ThemeColors.get();
    const m = this.margin;
    const innerW = Math.max(width - m.left - m.right, 50);
    const innerH = Math.max(height - m.top - m.bottom, 50);

    this.svg.selectAll('.empty-state-text').remove();
    this.svg.attr('aria-label', this._summary());

    const x = d3.scaleBand()
      .domain(this.data.map(d => d.monthKey))
      .range([m.left, m.left + innerW])
      .paddingInner(0.2)
      .paddingOuter(0.1);

    const nets = this.data.map(d => d.net);
    const y = d3.scaleLinear()
      .domain([Math.min(0, d3.min(nets)), Math.max(0, d3.max(nets))])
      .range([m.top + innerH, m.top])
      .nice(5);
    const zeroY = y(0);

    const barW = Math.min(this.options.maxBarWidth, x.bandwidth() * 0.7);
    const barX = d => x(d.monthKey) + (x.bandwidth() - barW) / 2;

    // Gridlines and y ticks
    const ticks = y.ticks(5);
    const compactAxis = d3.max(ticks.map(Math.abs)) >= 10000;
    this.gridGroup.selectAll('line')
      .data(ticks)
      .join('line')
      .attr('x1', m.left)
      .attr('x2', m.left + innerW)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', d => (d === 0 ? colors.zeroLine : colors.gridLine))
      .attr('stroke-width', 1)
      .attr('shape-rendering', 'crispEdges');

    this.axisGroup.selectAll('.y-tick')
      .data(ticks)
      .join('text')
      .attr('class', 'y-tick')
      .attr('x', m.left - 8)
      .attr('y', d => y(d))
      .attr('dy', '0.32em')
      .attr('text-anchor', 'end')
      .attr('fill', colors.textSecondary)
      .attr('font-size', 11)
      .text(d => this._axisMoney(d, compactAxis));

    // Month labels; thin them when columns get narrow
    const every = Math.ceil(36 / Math.max(x.step(), 1));
    this.axisGroup.selectAll('.x-tick')
      .data(this.data)
      .join('text')
      .attr('class', 'x-tick')
      .attr('x', d => x(d.monthKey) + x.bandwidth() / 2)
      .attr('y', m.top + innerH + 20)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.textSecondary)
      .attr('font-size', 11)
      .text((d, i) => (i % every === 0 ? this._monthTick(d.monthKey, i) : ''));

    // Columns: rounded at the data end, square on the baseline
    this.barsGroup.selectAll('path')
      .data(this.data, d => d.monthKey)
      .join('path')
      .attr('d', d => this._columnPath(barX(d), barW, zeroY, y(d.net)))
      .attr('fill', d => (d.net >= 0 ? colors.profit : colors.loss))
      .attr('opacity', 1);

    // Direct labels on the best, worst and latest month only
    const labelled = this._labelledMonths();
    this.labelsGroup.selectAll('text')
      .data(this.data.filter(d => labelled.has(d.monthKey)), d => d.monthKey)
      .join('text')
      .attr('x', d => x(d.monthKey) + x.bandwidth() / 2)
      .attr('y', d => (d.net >= 0 ? y(d.net) - 6 : y(d.net) + 14))
      .attr('text-anchor', 'middle')
      .attr('fill', colors.textPrimary)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .text(d => this._compactMoney(d.net));

    // Hit targets: the whole column, so the pointer only has to find the month
    const chart = this;
    this.hitGroup.selectAll('rect')
      .data(this.data, d => d.monthKey)
      .join('rect')
      .attr('x', d => x(d.monthKey) - (x.step() - x.bandwidth()) / 2)
      .attr('y', m.top)
      .attr('width', x.step())
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', d => `${this._monthName(d.monthKey)}: ${this._money(d.net)} net`)
      .on('pointerenter', (event, d) => this._focusMonth(d, event))
      .on('pointermove', event => this._moveTooltip(event))
      .on('pointerleave', () => this._clearFocus())
      .on('focus', function (event, d) {
        const box = this.getBoundingClientRect();
        chart._focusMonth(d, { pageX: box.right + window.scrollX, pageY: box.top + window.scrollY + 24 });
      })
      .on('blur', () => this._clearFocus());
  }

  _columnPath(x, w, baseY, valueY) {
    const h = Math.abs(baseY - valueY);
    if (h < 0.5) return `M${x},${baseY}h${w}v0.5h${-w}Z`;
    const r = Math.min(this.options.cornerRadius, w / 2, h);
    if (valueY < baseY) {
      // Positive: rounded top
      return `M${x},${baseY}V${valueY + r}Q${x},${valueY} ${x + r},${valueY}`
        + `H${x + w - r}Q${x + w},${valueY} ${x + w},${valueY + r}V${baseY}Z`;
    }
    // Negative: rounded bottom
    return `M${x},${baseY}V${valueY - r}Q${x},${valueY} ${x + r},${valueY}`
      + `H${x + w - r}Q${x + w},${valueY} ${x + w},${valueY - r}V${baseY}Z`;
  }

  _labelledMonths() {
    const keys = new Set();
    const best = this.data.reduce((a, b) => (b.net > a.net ? b : a));
    const worst = this.data.reduce((a, b) => (b.net < a.net ? b : a));
    if (best.net > 0) keys.add(best.monthKey);
    if (worst.net < 0) keys.add(worst.monthKey);
    keys.add(this.data[this.data.length - 1].monthKey);
    return keys;
  }

  _focusMonth(month, event) {
    this.barsGroup.selectAll('path')
      .attr('opacity', d => (d.monthKey === month.monthKey ? 1 : 0.35));
    this._fillTooltip(month);
    this.tooltip.style('visibility', 'visible');
    this._moveTooltip(event);
  }

  _clearFocus() {
    this.barsGroup.selectAll('path').attr('opacity', 1);
    this.tooltip.style('visibility', 'hidden');
  }

  /** Built with textContent: strategy names come from the uploaded CSV. */
  _fillTooltip(month) {
    const colors = ThemeColors.get();
    const node = this.tooltip.node();
    node.replaceChildren();

    const head = document.createElement('div');
    head.className = 'monthly-pl-tooltip-head';
    const value = document.createElement('div');
    value.className = 'monthly-pl-tooltip-value';
    value.textContent = this._money(month.net);
    const label = document.createElement('div');
    label.className = 'monthly-pl-tooltip-label';
    label.textContent = `${this._monthName(month.monthKey)} net`;
    head.append(value, label);
    node.appendChild(head);

    const limit = this.options.breakdownRows;
    const byImpact = [...month.strategies].sort((a, b) => Math.abs(b.pl) - Math.abs(a.pl));
    const shown = byImpact.slice(0, limit).sort((a, b) => b.pl - a.pl);

    const list = document.createElement('div');
    list.className = 'monthly-pl-tooltip-rows';
    shown.forEach(row => {
      const line = document.createElement('div');
      line.className = 'monthly-pl-tooltip-row';
      const key = document.createElement('span');
      key.className = 'monthly-pl-tooltip-key';
      key.style.backgroundColor = row.pl >= 0 ? colors.profit : colors.loss;
      const name = document.createElement('span');
      name.className = 'monthly-pl-tooltip-name';
      name.textContent = row.strategy;
      const amount = document.createElement('span');
      amount.className = 'monthly-pl-tooltip-amount';
      amount.textContent = this._money(row.pl);
      line.append(key, name, amount);
      list.appendChild(line);
    });

    const rest = byImpact.slice(limit);
    if (rest.length > 0) {
      const line = document.createElement('div');
      line.className = 'monthly-pl-tooltip-row monthly-pl-tooltip-more';
      const restPL = rest.reduce((sum, r) => sum + r.pl, 0);
      const name = document.createElement('span');
      name.className = 'monthly-pl-tooltip-name';
      name.textContent = `${rest.length} more ${rest.length === 1 ? 'strategy' : 'strategies'}`;
      const amount = document.createElement('span');
      amount.className = 'monthly-pl-tooltip-amount';
      amount.textContent = this._money(restPL);
      line.append(document.createElement('span'), name, amount);
      list.appendChild(line);
    }
    node.appendChild(list);
  }

  _moveTooltip(event) {
    const node = this.tooltip.node();
    const rect = node.getBoundingClientRect();
    const offset = 14;
    let left = event.pageX + offset;
    let top = event.pageY - offset;
    if (left + rect.width > window.scrollX + window.innerWidth - 8) {
      left = event.pageX - rect.width - offset;
    }
    if (top + rect.height > window.scrollY + window.innerHeight - 8) {
      top = window.scrollY + window.innerHeight - rect.height - 8;
    }
    this.tooltip.style('left', `${Math.max(8, left)}px`).style('top', `${top}px`);
  }

  _summary() {
    const best = this.data.reduce((a, b) => (b.net > a.net ? b : a));
    const worst = this.data.reduce((a, b) => (b.net < a.net ? b : a));
    return `Net P/L by month for ${this.data.length} months. `
      + `Best ${this._monthName(best.monthKey)} at ${this._money(best.net)}, `
      + `worst ${this._monthName(worst.monthKey)} at ${this._money(worst.net)}.`;
  }

  _parseKey(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }

  _monthName(monthKey) {
    return this._parseKey(monthKey).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  _monthTick(monthKey, index) {
    const date = this._parseKey(monthKey);
    const short = date.toLocaleDateString('en-US', { month: 'short' });
    return index === 0 || date.getMonth() === 0
      ? `${short} '${String(date.getFullYear()).slice(2)}`
      : short;
  }

  _money(value) {
    const sign = value >= 0 ? '+$' : '-$';
    return sign + Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  _compactMoney(value) {
    const sign = value >= 0 ? '+$' : '-$';
    const abs = Math.abs(value);
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e4) return `${sign}${Math.round(abs / 1e3)}K`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
    return `${sign}${Math.round(abs)}`;
  }

  _axisMoney(value, compact) {
    if (value === 0) return '$0';
    const sign = value > 0 ? '' : '-';
    const abs = Math.abs(value);
    if (compact) return `${sign}$${d3.format('~s')(abs).replace('k', 'K').replace('G', 'B')}`;
    return `${sign}$${d3.format(',~f')(abs)}`;
  }

  _showEmptyState() {
    [this.gridGroup, this.barsGroup, this.labelsGroup, this.axisGroup, this.hitGroup]
      .forEach(group => group.selectAll('*').remove());
    this.svg.selectAll('.empty-state-text').remove();
    const { width, height } = this.container.getBoundingClientRect();
    this.svg.append('text')
      .attr('class', 'empty-state-text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', ThemeColors.get().textSecondary)
      .attr('font-size', 14)
      .text('No closed trades in this range');
  }

  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.tooltip) this.tooltip.remove();
    if (this.container) this.container.innerHTML = '';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MonthlyPLChart;
}
