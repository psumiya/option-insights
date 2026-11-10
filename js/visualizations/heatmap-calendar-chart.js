/**
 * Heatmap Calendar Chart Component
 * Renders a calendar heatmap showing daily P/L with color intensity
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
class HeatmapCalendarChart {
  /**
   * Create Heatmap Calendar Chart
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Array} data - Array of {date, pl, tradeCount} objects
   * @param {Object} options - Chart configuration options
   */
  constructor(containerId, data = [], options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }

    // Chart configuration
    this.margin = { top: 56, right: 8, bottom: 10, left: 8 };
    this.cellSize = 100;
    this.cellGap = 4;
    this.viewMonth = null;
    this.options = {
      monthsToShow: 12,
      animationDuration: 750,
      ...options
    };

    // Initialize chart
    this._initChart();

    // Set up resize observer (Requirement 3.1)
    this._setupResizeObserver();

    // Render initial data
    if (data && data.length > 0) {
      this.update(data);
    }
  }

  /**
   * Initialize SVG and chart elements
   * @private
   */
  _initChart() {
    // Clear any existing content
    this.container.innerHTML = '';

    this.header = d3.select(`#${this.containerId}`)
      .append('div')
      .attr('class', 'heatmap-calendar-header')
      .style('display', 'none')
      .on('keydown', (event) => {
        if (event.key === 'ArrowLeft') { this._navigate(-1); event.preventDefault(); }
        if (event.key === 'ArrowRight') { this._navigate(1); event.preventDefault(); }
      });

    this.prevButton = this.header.append('button')
      .attr('type', 'button')
      .attr('class', 'heatmap-calendar-nav')
      .attr('aria-label', 'Previous month')
      .text('‹')
      .on('click', () => this._navigate(-1));

    this.monthTitle = this.header.append('span')
      .attr('class', 'heatmap-calendar-title')
      .attr('aria-live', 'polite');

    this.nextButton = this.header.append('button')
      .attr('type', 'button')
      .attr('class', 'heatmap-calendar-nav')
      .attr('aria-label', 'Next month')
      .text('›')
      .on('click', () => this._navigate(1));

    // Create SVG (dimensions will be set during render)
    this.svg = d3.select(`#${this.containerId}`)
      .append('svg')
      .attr('class', 'heatmap-calendar-svg');

    // Create main group for chart content
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Create groups for different chart elements
    this.monthLabelsGroup = this.chartGroup.append('g').attr('class', 'month-labels');
    this.cellsGroup = this.chartGroup.append('g').attr('class', 'cells-group');
    this.cellTextGroup = this.chartGroup.append('g').attr('class', 'cell-text-group');
    this.legendGroup = this.chartGroup.append('g').attr('class', 'legend-group');

    // Create tooltip
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', '#141b2d')
      .style('border', '1px solid #1f2937')
      .style('border-radius', '4px')
      .style('padding', '8px 12px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', '0 4px 6px rgba(0, 0, 0, 0.3)');

    // Initialize color scale (Requirement 3.3)
    // Red (loss) → White (neutral) → Green (profit)
    const colors = window.ThemeColors ? ThemeColors.get() : { loss: '#ef4444', surface: '#1f2937', profit: '#10b981' };
    this.colorScale = d3.scalePow()
      .exponent(0.6)
      .range([colors.loss, colors.surface, colors.profit])
      .clamp(true);
  }

  /**
   * Set up ResizeObserver for responsive behavior
   * @private
   */
  _setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(this.container);
  }

  /**
   * Update chart with new data
   * @param {Array} data - Array of daily P/L objects
   */
  update(data) {
    if (!data || data.length === 0) {
      this._showEmptyState();
      return;
    }

    // Remove empty state text if it exists
    if (this.chartGroup) {
      this.chartGroup.selectAll('.empty-state-text').remove();
    }

    this.data = data;
    this.currentData = data; // Store for theme updates

    // Update colors based on current theme
    if (window.ThemeColors) {
      const colors = ThemeColors.get();
      this.colorScale.range([colors.loss, colors.surface, colors.profit]);

      // Update tooltip styles
      this.tooltip
        .style('background-color', colors.tooltipBg)
        .style('border', `1px solid ${colors.tooltipBorder}`)
        .style('color', colors.textPrimary);
    }

    this._processData();

    if (!this.viewMonth || this.viewMonth > this.lastMonth) {
      this.viewMonth = new Date(this.lastMonth);
    } else if (this.viewMonth < this.firstMonth) {
      this.viewMonth = new Date(this.firstMonth);
    }

    this.header.style('display', null);
    this._render();
  }

  /**
   * Render the chart
   * @private
   */
  _render(duration = this.options.animationDuration) {
    this._duration = duration;
    const containerRect = this.container.getBoundingClientRect();
    const headerHeight = this.header.node().offsetHeight || 0;

    // A Mon–Fri month never spans more than five week rows, so the grid is a
    // fixed 5×5 sized to whichever of width or height is tighter
    const gridGaps = this.cellGap * 4;
    const fitWidth = (containerRect.width - this.margin.left - this.margin.right - gridGaps) / 5;
    const fitHeight = (containerRect.height - headerHeight - this.margin.top - this.margin.bottom - gridGaps) / 5;
    this.cellSize = Math.floor(Math.min(Math.max(Math.min(fitWidth, fitHeight), 56), 140));

    this.width = 5 * this.cellSize + gridGaps;
    this.height = this.width;

    const totalSvgWidth = Math.max(containerRect.width, this.width + this.margin.left + this.margin.right);
    const totalSvgHeight = this.height + this.margin.top + this.margin.bottom;
    const offsetX = Math.max(this.margin.left, (totalSvgWidth - this.width) / 2);

    this.svg
      .attr('width', totalSvgWidth)
      .attr('height', totalSvgHeight);
    this.chartGroup.attr('transform', `translate(${offsetX},${this.margin.top})`);

    // Domain spans every month in range so colors compare across pages
    const plValues = this.processedData.map(d => d.pl);
    const maxAbsPL = Math.max(Math.abs(d3.min(plValues) || 0), Math.abs(d3.max(plValues) || 0));
    this.colorScale.domain([-maxAbsPL, 0, maxAbsPL]);

    this._updateNav();

    // Render calendar grid (Requirement 3.2)
    this._renderCalendar();

    // Render cell text
    this._renderCellText();

    // Render weekday headers (Requirement 3.2)
    this._renderDayHeaders();

    // Render legend
    this._renderLegend();
  }

  /**
   * Process data and filter to last N months
   * @private
   */
  _processData() {
    // Convert dates to Date objects and sort
    // Ensure dates are parsed in local timezone to avoid day-of-week shifts
    this.processedData = this.data.map(d => {
      let date;
      if (d.date instanceof Date) {
        date = d.date;
      } else if (typeof d.date === 'string') {
        // Parse YYYY-MM-DD in local timezone
        const parts = d.date.split('-');
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      } else {
        date = new Date(d.date);
      }
      return {
        date: date,
        pl: d.pl,
        tradeCount: d.tradeCount,
        // Optional short label (e.g. a structure code) shown beside the trade
        // count. Callers that omit it get the original count-only text.
        label: d.label || null
      };
    }).sort((a, b) => a.date - b.date);

    // Filter to last N months (Requirement 3.6)
    const endDate = new Date(Math.max(...this.processedData.map(d => d.date)));
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - this.options.monthsToShow);

    this.processedData = this.processedData.filter(d => d.date >= startDate);

    // Calculate date range for calendar
    if (this.processedData.length > 0) {
      this.startDate = new Date(Math.min(...this.processedData.map(d => d.date)));
      this.endDate = new Date(Math.max(...this.processedData.map(d => d.date)));
    } else {
      const now = new Date();
      this.endDate = now;
      this.startDate = new Date(now);
      this.startDate.setMonth(this.startDate.getMonth() - this.options.monthsToShow);
    }

    this.firstMonth = d3.timeMonth.floor(this.startDate);
    this.lastMonth = d3.timeMonth.floor(this.endDate);

    // Create a map for quick lookup using local timezone
    this.dataMap = new Map();
    this.processedData.forEach(d => {
      this.dataMap.set(this._dateKey(d.date), d);
    });
  }

  /**
   * @private
   */
  _dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Weekday cells of the month in view, positioned Mon–Fri across and one
   * row per week
   * @private
   */
  _cellData() {
    const monthStart = this.viewMonth;
    const weekdays = d3.timeDays(monthStart, d3.timeMonth.offset(monthStart, 1))
      .filter(date => date.getDay() !== 0 && date.getDay() !== 6);
    const firstWeek = d3.timeMonday.floor(weekdays[0]);
    const step = this.cellSize + this.cellGap;

    return weekdays.map(date => {
      const data = this.dataMap.get(this._dateKey(date));
      return {
        date: date,
        x: (date.getDay() - 1) * step,
        y: d3.timeMonday.count(firstWeek, date) * step,
        pl: data ? data.pl : null,
        tradeCount: data ? data.tradeCount : 0,
        label: data ? data.label : null,
        hasData: !!data
      };
    });
  }

  /**
   * Render calendar grid with day cells
   * @private
   */
  _renderCalendar() {
    const cellData = this._cellData();

    // Bind data
    const cells = this.cellsGroup
      .selectAll('.calendar-cell')
      .data(cellData, d => d3.timeFormat('%Y-%m-%d')(d.date));

    // Enter
    const cellsEnter = cells.enter()
      .append('rect')
      .attr('class', 'calendar-cell')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', this.cellSize)
      .attr('height', this.cellSize)
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('opacity', 0);

    // Enter + Update
    cellsEnter.merge(cells)
      .style('cursor', d => d.hasData ? 'pointer' : 'default')
      .on('mouseover', (event, d) => {
        if (d.hasData) {
          this._showTooltip(event, d);
        }
      })
      .on('mouseout', () => this._hideTooltip())
      .transition()
      .duration(this._duration)
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', this.cellSize)
      .attr('height', this.cellSize)
      .attr('fill', d => {
        const colors = window.ThemeColors ? ThemeColors.get() : { gridLine: '#1f2937' };
        if (!d.hasData) {
          // Empty days shown as grid line color (distinguishable from surface)
          return colors.gridLine;
        }
        // Color-code based on P/L (Requirement 3.3)
        return this.colorScale(d.pl);
      })
      .attr('stroke', d => {
        const colors = window.ThemeColors ? ThemeColors.get() : { surface: '#141b2d', background: '#0f172a' };
        return d.hasData ? colors.surface : colors.background;
      })
      .attr('stroke-width', 1)
      .attr('opacity', 1);

    // Exit
    cells.exit().remove();
  }

  /**
   * Render text inside calendar cells
   * @private
   */
  _renderCellText() {
    const cellData = this._cellData();
    const dataCells = cellData.filter(d => d.hasData);

    // Calculate dynamic font sizes based on cell size
    const dateFontSize = Math.max(9, Math.min(this.cellSize * 0.14, 14));
    const plFontSize = Math.max(11, Math.min(this.cellSize * 0.18, 18));
    const tradeFontSize = Math.max(8, Math.min(this.cellSize * 0.12, 12));

    // Calculate dynamic positioning
    const dateYOffset = this.cellSize * 0.20;
    const plYOffset = this.cellSize * 0.55;
    const tradeYOffset = this.cellSize * 0.85;
    const compact = this.cellSize < 90;

    const textFill = d => d.hasData
      ? this._getContrastColor(this.colorScale(d.pl))
      : (window.ThemeColors ? ThemeColors.get().textSecondary : '#9ca3af');

    // Day number in every cell's corner, since the month is in the header
    const dateLabels = this.cellTextGroup
      .selectAll('.cell-date-text')
      .data(cellData, d => d3.timeFormat('%Y-%m-%d')(d.date));

    const dateLabelsEnter = dateLabels.enter()
      .append('text')
      .attr('class', 'cell-date-text')
      .attr('text-anchor', 'start')
      .attr('font-weight', '600')
      .attr('x', d => d.x + 6)
      .attr('y', d => d.y + dateYOffset)
      .attr('opacity', 0)
      .style('pointer-events', 'none');

    dateLabelsEnter.merge(dateLabels)
      .transition()
      .duration(this._duration)
      .attr('x', d => d.x + 6)
      .attr('y', d => d.y + dateYOffset)
      .attr('font-size', `${dateFontSize}px`)
      .attr('fill', textFill)
      .attr('opacity', d => d.hasData ? 1 : 0.6)
      .text(d => d.date.getDate());

    dateLabels.exit().remove();

    // Bind data for P/L labels
    const plLabels = this.cellTextGroup
      .selectAll('.cell-pl-text')
      .data(dataCells, d => d3.timeFormat('%Y-%m-%d')(d.date));

    const plLabelsEnter = plLabels.enter()
      .append('text')
      .attr('class', 'cell-pl-text')
      .attr('text-anchor', 'middle')
      .attr('font-weight', '700')
      .attr('x', d => d.x + this.cellSize / 2)
      .attr('y', d => d.y + plYOffset)
      .attr('opacity', 0)
      .style('pointer-events', 'none');

    plLabelsEnter.merge(plLabels)
      .transition()
      .duration(this._duration)
      .attr('x', d => d.x + this.cellSize / 2)
      .attr('y', d => d.y + plYOffset)
      .attr('font-size', `${plFontSize}px`)
      .attr('fill', textFill)
      .attr('opacity', 1)
      .text(d => compact ? this._formatCompactCurrency(d.pl) : this._formatCurrency(d.pl));

    plLabels.exit().remove();

    // Bind data for trade count labels
    const tradeLabels = this.cellTextGroup
      .selectAll('.cell-trade-text')
      .data(dataCells, d => d3.timeFormat('%Y-%m-%d')(d.date));

    const tradeLabelsEnter = tradeLabels.enter()
      .append('text')
      .attr('class', 'cell-trade-text')
      .attr('text-anchor', 'middle')
      .attr('font-weight', '500')
      .attr('x', d => d.x + this.cellSize / 2)
      .attr('y', d => d.y + tradeYOffset)
      .attr('opacity', 0)
      .style('pointer-events', 'none');

    tradeLabelsEnter.merge(tradeLabels)
      .transition()
      .duration(this._duration)
      .attr('x', d => d.x + this.cellSize / 2)
      .attr('y', d => d.y + tradeYOffset)
      .attr('font-size', `${tradeFontSize}px`)
      .attr('fill', textFill)
      .attr('opacity', 0.9)
      .text(d => {
        const count = `${d.tradeCount} trade${d.tradeCount !== 1 ? 's' : ''}`;
        return d.label ? `${d.tradeCount} · ${d.label}` : count;
      });

    tradeLabels.exit().remove();
  }

  /**
   * Get contrasting text color for background
   * @param {string} bgColor - Background color
   * @returns {string} - Contrasting text color
   * @private
   */
  _getContrastColor(bgColor) {
    // Convert color to RGB
    const rgb = d3.rgb(bgColor);

    // Calculate relative luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#1f2937' : '#ffffff';
  }

  /**
   * Render Mon–Fri headers above the columns
   * @private
   */
  _renderDayHeaders() {
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const dayLabels = this.monthLabelsGroup
      .selectAll('.day-label')
      .data(daysOfWeek);

    dayLabels.enter()
      .append('text')
      .attr('class', 'day-label')
      .merge(dayLabels)
      .attr('x', (d, i) => i * (this.cellSize + this.cellGap) + this.cellSize / 2)
      .attr('y', -12)
      .attr('text-anchor', 'middle')
      .attr('fill', window.ThemeColors ? ThemeColors.get().textSecondary : '#9ca3af')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text(d => d);

    dayLabels.exit().remove();
  }

  /**
   * Step the month in view, staying within the data's range
   * @param {number} delta - Months to move (negative is earlier)
   * @private
   */
  _navigate(delta) {
    if (!this.viewMonth) return;
    const target = d3.timeMonth.offset(this.viewMonth, delta);
    if (target < this.firstMonth || target > this.lastMonth) return;
    this.viewMonth = target;
    this._hideTooltip();
    this._render(200);
  }

  /**
   * @private
   */
  _updateNav() {
    this.monthTitle.text(d3.timeFormat('%B %Y')(this.viewMonth));
    this.prevButton.property('disabled', this.viewMonth <= this.firstMonth);
    this.nextButton.property('disabled', this.viewMonth >= this.lastMonth);
  }

  /**
   * Render color legend
   * @private
   */
  _renderLegend() {
    const legendWidth = Math.max(60, Math.min(200, this.width - 150));
    const legendHeight = 10;
    const legendX = this.width - 70 - legendWidth;
    const legendY = -42;

    // Remove existing legend
    this.legendGroup.selectAll('*').remove();

    // Create gradient
    const defs = this.svg.select('defs').empty()
      ? this.svg.append('defs')
      : this.svg.select('defs');

    const gradientId = `heatmap-gradient-${this.containerId}`;
    const gradient = defs.selectAll(`#${gradientId}`).data([null]);
    const gradientEnter = gradient.enter()
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('x2', '100%');

    const colors = window.ThemeColors ? ThemeColors.get() : { loss: '#ef4444', surface: '#1f2937', profit: '#10b981' };

    gradientEnter.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', colors.loss);

    gradientEnter.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', colors.surface);

    gradientEnter.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', colors.profit);

    // Draw legend rectangle
    this.legendGroup.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', `url(#${gradientId})`)
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 1);

    // Add legend labels
    const plValues = this.processedData.map(d => d.pl);
    const minPL = d3.min(plValues) || 0;
    const maxPL = d3.max(plValues) || 0;

    this.legendGroup.append('text')
      .attr('x', legendX - 5)
      .attr('y', legendY + legendHeight / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', '10px')
      .text(this._formatCompactCurrency(minPL));

    this.legendGroup.append('text')
      .attr('x', legendX + legendWidth + 5)
      .attr('y', legendY + legendHeight / 2)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', '10px')
      .text(this._formatCompactCurrency(maxPL));
  }

  /**
   * Show tooltip on hover (Requirement 3.4)
   * @param {Event} event - Mouse event
   * @param {Object} data - Cell data
   * @private
   */
  _showTooltip(event, data) {
    const plColor = data.pl >= 0 ? '#10b981' : '#ef4444';
    const dateStr = d3.timeFormat('%b %d, %Y')(data.date);

    this.tooltip
      .style('visibility', 'visible')
      .html(`
        <div style="color: #e5e7eb; font-weight: 600; margin-bottom: 4px;">
          ${dateStr}
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          P/L: <span style="color: ${plColor}; font-weight: 600;">${this._formatCurrency(data.pl)}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px;">
          Trades: <span style="color: #e5e7eb; font-weight: 600;">${data.tradeCount}</span>
        </div>
        ${data.label ? `<div style="color: #9ca3af; font-size: 11px;">
          Structure: <span style="color: #e5e7eb; font-weight: 600;">${data.label}</span>
        </div>` : ''}
      `);

    this._positionTooltip(event);
  }

  /**
   * Position tooltip near cursor
   * @param {Event} event - Mouse event
   * @private
   */
  _positionTooltip(event) {
    const tooltipNode = this.tooltip.node();
    const tooltipRect = tooltipNode.getBoundingClientRect();
    const offset = 15;

    let left = event.pageX + offset;
    let top = event.pageY + offset;

    // Adjust if tooltip goes off screen
    if (left + tooltipRect.width > window.innerWidth) {
      left = event.pageX - tooltipRect.width - offset;
    }

    if (top + tooltipRect.height > window.innerHeight) {
      top = event.pageY - tooltipRect.height - offset;
    }

    this.tooltip
      .style('left', `${left}px`)
      .style('top', `${top}px`);
  }

  /**
   * Hide tooltip
   * @private
   */
  _hideTooltip() {
    this.tooltip.style('visibility', 'hidden');
  }

  /**
   * Format currency values
   * @param {number} value - Numeric value
   * @returns {string} - Formatted currency string
   * @private
   */
  _formatCurrency(value) {
    const sign = value >= 0 ? '+' : '';
    return sign + '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Short currency for small cells and the legend, e.g. +$1.2k
   * @private
   */
  _formatCompactCurrency(value) {
    const sign = value >= 0 ? '+' : '-';
    const abs = Math.abs(value);
    if (abs >= 1000) {
      return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
    }
    return `${sign}$${abs.toFixed(0)}`;
  }

  /**
   * Show empty state when no data
   * @private
   */
  _showEmptyState() {
    // Clear chart groups but keep SVG structure
    if (this.header) this.header.style('display', 'none');
    if (this.cellsGroup) this.cellsGroup.selectAll('*').remove();
    if (this.cellTextGroup) this.cellTextGroup.selectAll('*').remove();
    if (this.monthLabelsGroup) this.monthLabelsGroup.selectAll('*').remove();
    if (this.legendGroup) this.legendGroup.selectAll('*').remove();

    // Add empty state message to chart group
    if (this.chartGroup) {
      this.chartGroup.selectAll('.empty-state-text').remove();

      const containerRect = this.container.getBoundingClientRect();
      const width = containerRect.width - this.margin.left - this.margin.right;
      const height = containerRect.height - this.margin.top - this.margin.bottom;

      this.chartGroup.append('text')
        .attr('class', 'empty-state-text')
        .attr('x', width / 2)
        .attr('y', height / 2 - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '16px')
        .text('No calendar data available');

      this.chartGroup.append('text')
        .attr('class', 'empty-state-text')
        .attr('x', width / 2)
        .attr('y', height / 2 + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '12px')
        .text('Upload trades with close dates to see daily P/L patterns');
    }
  }

  /**
   * Resize chart to fit container
   */
  resize() {
    if (this.data && this.data.length > 0) {
      this._render();
    }
  }

  /**
   * Destroy chart and clean up resources
   */
  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.tooltip) {
      this.tooltip.remove();
    }

    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }

    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HeatmapCalendarChart;
}
