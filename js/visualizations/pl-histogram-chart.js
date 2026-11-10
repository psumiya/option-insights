/**
 * Trade P/L Histogram
 * How every closed trade's P/L is spread: many small wins against fewer,
 * larger losses shows up as a long red left tail. The 2nd and 98th
 * percentiles bound the regular bins; anything beyond lands in an edge bin,
 * so a few outliers cannot squash the rest. Bins are aligned to zero so no
 * bar mixes wins and losses.
 */
class PLHistogramChart {
  /**
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Object} options - { captionId }
   */
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }

    this.caption = options.captionId ? document.getElementById(options.captionId) : null;
    this.margin = { top: 36, right: 12, bottom: 40, left: 44 };
    this.summary = null;

    this._initChart();
    this.resizeObserver = new ResizeObserver(() => {
      if (this.summary) this._render();
    });
    this.resizeObserver.observe(this.container);
  }

  /**
   * Bin P/L values and work out the figures the caption quotes. Pure.
   * @param {Array<number>} values - Closed-trade P/L
   * @param {Object} options - { targetBins, tailPercentile, worstCount }
   * @returns {Object|null} - null when there are too few trades to bin
   */
  static summarize(values, options = {}) {
    const targetBins = options.targetBins || 24;
    const tail = options.tailPercentile ?? 0.02;
    const worstCount = options.worstCount || 10;

    const sorted = (values || []).filter(Number.isFinite).sort((a, b) => a - b);
    const n = sorted.length;
    if (n < 5) return null;

    const at = p => sorted[Math.min(n - 1, Math.max(0, Math.floor(p * (n - 1))))];
    const sum = list => list.reduce((total, v) => total + v, 0);

    const lowCut = at(tail);
    const highCut = at(1 - tail);
    const step = PLHistogramChart.niceStep(Math.max(highCut - lowCut, 1) / targetBins);
    const low = Math.floor(lowCut / step) * step;
    let high = Math.ceil(highCut / step) * step;
    if (high === low) high = low + step;

    const bins = [];
    const underflow = sorted.filter(v => v < low);
    const overflow = sorted.filter(v => v >= high);
    if (underflow.length) {
      bins.push({ kind: 'under', x0: -Infinity, x1: low, values: underflow });
    }
    for (let x0 = low; x0 < high - step / 2; x0 += step) {
      const x1 = x0 + step;
      bins.push({ kind: 'regular', x0, x1, values: sorted.filter(v => v >= x0 && v < x1) });
    }
    if (overflow.length) {
      bins.push({ kind: 'over', x0: high, x1: Infinity, values: overflow });
    }
    bins.forEach(bin => {
      bin.count = bin.values.length;
      bin.total = sum(bin.values);
      bin.positive = bin.x0 >= 0;
    });

    const wins = sorted.filter(v => v > 0);
    const losses = sorted.filter(v => v < 0);
    const worst = n >= 2 * worstCount ? sorted.slice(0, worstCount) : [];
    const grossWins = sum(wins);

    return {
      n,
      step,
      low,
      high,
      bins,
      median: at(0.5),
      avgWin: wins.length ? grossWins / wins.length : null,
      avgLoss: losses.length ? sum(losses) / losses.length : null,
      grossWins,
      worstCount: worst.length,
      worstTotal: sum(worst),
      worstShareOfWins: worst.length && grossWins > 0 ? -sum(worst) / grossWins : null
    };
  }

  /** 1, 2, 2.5 or 5 times a power of ten, at or above the raw step. */
  static niceStep(raw) {
    const power = Math.pow(10, Math.floor(Math.log10(raw)));
    const scaled = raw / power;
    const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
    return nice * power;
  }

  /** Caption sentences, as parts so figures can be emphasised. Pure. */
  static captionParts(summary) {
    if (!summary) return [];
    const money = PLHistogramChart.money;
    const parts = [
      { text: 'Median trade ' },
      { text: money(summary.median), tone: summary.median >= 0 ? 'profit' : 'loss' },
      { text: '.' }
    ];
    if (summary.avgWin !== null && summary.avgLoss !== null) {
      parts.push(
        { text: ' Average win ' },
        { text: money(summary.avgWin), tone: 'profit' },
        { text: ', average loss ' },
        { text: money(summary.avgLoss), tone: 'loss' },
        { text: '.' }
      );
    }
    if (summary.worstShareOfWins !== null) {
      parts.push(
        { text: ` Your ${summary.worstCount} worst trades lost ` },
        { text: money(Math.abs(summary.worstTotal)).replace('+', ''), tone: 'loss' },
        { text: `, ${Math.round(summary.worstShareOfWins * 100)}% of gross wins.` }
      );
    }
    return parts;
  }

  static money(value) {
    const sign = value >= 0 ? '+$' : '-$';
    return sign + Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  static compactMoney(value) {
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}K`;
    return `${sign}$${abs % 1 === 0 ? abs : abs.toFixed(2)}`;
  }

  _initChart() {
    this.container.innerHTML = '';
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('class', 'pl-histogram-svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('role', 'img');

    this.gridGroup = this.svg.append('g');
    this.barsGroup = this.svg.append('g');
    this.markerGroup = this.svg.append('g');
    this.axisGroup = this.svg.append('g');
    this.hitGroup = this.svg.append('g').attr('class', 'pl-histogram-hits');

    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'monthly-pl-tooltip')
      .attr('role', 'status')
      .style('visibility', 'hidden');
  }

  /**
   * @param {Array<number>} values - Closed-trade P/L
   */
  update(values) {
    this.summary = PLHistogramChart.summarize(values);
    this._renderCaption();
    if (!this.summary) {
      this._showEmptyState();
      return;
    }
    this._render();
  }

  _renderCaption() {
    if (!this.caption) return;
    this.caption.replaceChildren();
    PLHistogramChart.captionParts(this.summary).forEach(part => {
      if (!part.tone) {
        this.caption.append(part.text);
        return;
      }
      const span = document.createElement('span');
      span.className = `headline-figure text-${part.tone}`;
      span.textContent = part.text;
      this.caption.appendChild(span);
    });
  }

  _render() {
    const { width, height } = this.container.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const s = this.summary;
    const m = this.margin;
    const innerW = Math.max(width - m.left - m.right, 50);
    const innerH = Math.max(height - m.top - m.bottom, 50);
    const baseY = m.top + innerH;

    this.svg.selectAll('.empty-state-text').remove();
    this.svg.attr('aria-label',
      `Histogram of ${s.n} closed trades by P/L. ${PLHistogramChart.captionParts(s).map(p => p.text).join('')}`);

    const x = d3.scaleBand()
      .domain(s.bins.map((_, i) => i))
      .range([m.left, m.left + innerW])
      .paddingInner(0.12);
    const y = d3.scaleLinear()
      .domain([0, d3.max(s.bins, b => b.count) || 1])
      .range([baseY, m.top])
      .nice(4);

    // Gridlines and count ticks
    const ticks = y.ticks(4).filter(Number.isInteger);
    this.gridGroup.selectAll('line')
      .data(ticks)
      .join('line')
      .attr('x1', m.left)
      .attr('x2', m.left + innerW)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('shape-rendering', 'crispEdges')
      .style('stroke', d => (d === 0 ? 'var(--svg-zero-line)' : 'var(--svg-grid-line)'));

    this.axisGroup.selectAll('.y-tick')
      .data(ticks)
      .join('text')
      .attr('class', 'y-tick')
      .attr('x', m.left - 8)
      .attr('y', d => y(d))
      .attr('dy', '0.32em')
      .attr('text-anchor', 'end')
      .attr('font-size', 11)
      .style('fill', 'var(--svg-text-secondary)')
      .text(d => d);

    this.axisGroup.selectAll('.y-title')
      .data([0])
      .join('text')
      .attr('class', 'y-title')
      .attr('x', m.left - 8)
      .attr('y', m.top - 14)
      .attr('text-anchor', 'start')
      .attr('font-size', 11)
      .style('fill', 'var(--svg-text-secondary)')
      .text('Trades');

    // Bars: rounded at the top, square on the baseline
    const r = 3;
    this.barsGroup.selectAll('path')
      .data(s.bins)
      .join('path')
      .attr('d', (bin, i) => {
        const bx = x(i);
        const bw = x.bandwidth();
        const top = y(bin.count);
        if (bin.count === 0) return '';
        const rr = Math.min(r, bw / 2, baseY - top);
        return `M${bx},${baseY}V${top + rr}Q${bx},${top} ${bx + rr},${top}`
          + `H${bx + bw - rr}Q${bx + bw},${top} ${bx + bw},${top + rr}V${baseY}Z`;
      })
      .style('fill', bin => (bin.positive ? 'var(--svg-profit)' : 'var(--svg-loss)'))
      .style('opacity', bin => (bin.kind === 'regular' ? 1 : 0.7));

    // X labels: edge values every few bins, always including zero
    const every = Math.max(1, Math.ceil(46 / x.step()));
    const labels = [];
    s.bins.forEach((bin, i) => {
      if (bin.kind === 'under') {
        labels.push({ at: x(i) + x.bandwidth() / 2, text: `≤ ${PLHistogramChart.compactMoney(bin.x1)}` });
      } else if (bin.kind === 'over') {
        labels.push({ at: x(i) + x.bandwidth() / 2, text: `≥ ${PLHistogramChart.compactMoney(bin.x0)}` });
      } else if (!(s.bins[i - 1] && s.bins[i - 1].kind === 'under')) {
        // The edge bin's own label already names this boundary
        const edgeIndex = Math.round((bin.x0 - s.low) / s.step);
        if (bin.x0 === 0 || edgeIndex % every === 0) {
          const nearZero = Math.abs(bin.x0) < s.step * every && bin.x0 !== 0;
          if (!nearZero) labels.push({ at: x(i) - x.step() * x.paddingInner() / 2, text: PLHistogramChart.compactMoney(bin.x0) });
        }
      }
    });
    this.axisGroup.selectAll('.x-tick')
      .data(labels)
      .join('text')
      .attr('class', 'x-tick')
      .attr('x', d => d.at)
      .attr('y', baseY + 18)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .style('fill', 'var(--svg-text-secondary)')
      .text(d => d.text);

    // Average win and average loss markers
    const position = value => {
      const i = s.bins.findIndex(bin => value >= bin.x0 && value < bin.x1);
      if (i === -1) return null;
      const bin = s.bins[i];
      if (bin.kind !== 'regular') return x(i) + x.bandwidth() / 2;
      return x(i) + ((value - bin.x0) / s.step) * x.bandwidth();
    };
    const markers = [
      { label: 'avg loss', value: s.avgLoss, anchor: 'end', dx: -4 },
      { label: 'avg win', value: s.avgWin, anchor: 'start', dx: 4 }
    ].filter(mk => mk.value !== null && position(mk.value) !== null);

    this.markerGroup.selectAll('line')
      .data(markers)
      .join('line')
      .attr('x1', d => position(d.value))
      .attr('x2', d => position(d.value))
      .attr('y1', m.top - 6)
      .attr('y2', baseY)
      .attr('stroke-width', 1)
      .style('stroke', 'var(--svg-text-secondary)');

    this.markerGroup.selectAll('text')
      .data(markers)
      .join('text')
      .attr('x', d => position(d.value) + d.dx)
      .attr('y', m.top - 2)
      .attr('text-anchor', d => d.anchor)
      .attr('font-size', 11)
      .style('fill', 'var(--svg-text-primary)')
      .text(d => `${d.label} ${PLHistogramChart.money(d.value)}`);

    // Hover and focus: the whole column for each bin
    const chart = this;
    this.hitGroup.selectAll('rect')
      .data(s.bins)
      .join('rect')
      .attr('x', (_, i) => x(i) - (x.step() - x.bandwidth()) / 2)
      .attr('y', m.top)
      .attr('width', x.step())
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', bin => `${this._rangeLabel(bin)}: ${bin.count} trades`)
      .on('pointerenter', (event, bin) => this._focusBin(bin, event))
      .on('pointermove', event => this._moveTooltip(event))
      .on('pointerleave', () => this._clearFocus())
      .on('focus', function (event, bin) {
        const box = this.getBoundingClientRect();
        chart._focusBin(bin, { pageX: box.right + window.scrollX, pageY: box.top + window.scrollY + 24 });
      })
      .on('blur', () => this._clearFocus());
  }

  _rangeLabel(bin) {
    const money = PLHistogramChart.money;
    if (bin.kind === 'under') return `Below ${money(bin.x1)}`;
    if (bin.kind === 'over') return `${money(bin.x0)} and above`;
    return `${money(bin.x0)} to ${money(bin.x1)}`;
  }

  _focusBin(bin, event) {
    this.barsGroup.selectAll('path').style('opacity', d => (d === bin ? 1 : 0.35));

    const node = this.tooltip.node();
    node.replaceChildren();
    const value = document.createElement('div');
    value.className = 'monthly-pl-tooltip-value';
    value.textContent = `${bin.count} trade${bin.count === 1 ? '' : 's'}`;
    const label = document.createElement('div');
    label.className = 'monthly-pl-tooltip-label';
    label.textContent = this._rangeLabel(bin);
    const head = document.createElement('div');
    head.className = 'monthly-pl-tooltip-head';
    head.append(value, label);
    node.appendChild(head);

    const rows = document.createElement('div');
    rows.className = 'monthly-pl-tooltip-rows';
    [
      ['Share of trades', `${((bin.count / this.summary.n) * 100).toFixed(1)}%`],
      ['Combined P/L', PLHistogramChart.money(bin.total)]
    ].forEach(([name, amount]) => {
      const row = document.createElement('div');
      row.className = 'monthly-pl-tooltip-row';
      const nameEl = document.createElement('span');
      nameEl.className = 'monthly-pl-tooltip-name';
      nameEl.textContent = name;
      const amountEl = document.createElement('span');
      amountEl.className = 'monthly-pl-tooltip-amount';
      amountEl.textContent = amount;
      row.append(document.createElement('span'), nameEl, amountEl);
      rows.appendChild(row);
    });
    node.appendChild(rows);

    this.tooltip.style('visibility', 'visible');
    this._moveTooltip(event);
  }

  _clearFocus() {
    this.barsGroup.selectAll('path')
      .style('opacity', bin => (bin.kind === 'regular' ? 1 : 0.7));
    this.tooltip.style('visibility', 'hidden');
  }

  _moveTooltip(event) {
    const rect = this.tooltip.node().getBoundingClientRect();
    const offset = 14;
    let left = event.pageX + offset;
    let top = event.pageY - offset;
    if (left + rect.width > window.scrollX + window.innerWidth - 8) left = event.pageX - rect.width - offset;
    if (top + rect.height > window.scrollY + window.innerHeight - 8) top = window.scrollY + window.innerHeight - rect.height - 8;
    this.tooltip.style('left', `${Math.max(8, left)}px`).style('top', `${top}px`);
  }

  _showEmptyState() {
    [this.gridGroup, this.barsGroup, this.markerGroup, this.axisGroup, this.hitGroup]
      .forEach(group => group.selectAll('*').remove());
    this.svg.selectAll('.empty-state-text').remove();
    const { width, height } = this.container.getBoundingClientRect();
    this.svg.append('text')
      .attr('class', 'empty-state-text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', 14)
      .style('fill', 'var(--svg-text-secondary)')
      .text('Not enough closed trades to show a distribution');
  }

  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.tooltip) this.tooltip.remove();
    if (this.container) this.container.innerHTML = '';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PLHistogramChart;
}
