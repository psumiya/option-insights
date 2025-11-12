/**
 * P/L Trend Chart Component
 * Renders a line chart showing monthly profit/loss trends with cumulative P/L
 * Requirements: 4.1, 4.3, 4.5, 11.2, 11.5
 */
class PLTrendChart {
  /**
   * Create P/L Trend Chart
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Array} data - Array of {month, monthLabel, pl, cumulativePL} objects
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
    this.margin = { top: 20, right: 30, bottom: 60, left: 70 };
    this.options = {
      showGrid: true,
      animationDuration: 750,
      ...options
    };

    // Initialize chart
    this._initChart();
    
    // Set up resize observer (Requirement 11.5)
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

    // Create SVG
    this.svg = d3.select(`#${this.containerId}`)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('class', 'pl-trend-svg');

    // Create main group for chart content
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Create groups for different chart elements
    this.gridGroup = this.chartGroup.append('g').attr('class', 'grid');
    this.lineGroup = this.chartGroup.append('g').attr('class', 'line-group');
    this.dotsGroup = this.chartGroup.append('g').attr('class', 'dots-group');
    this.xAxisGroup = this.chartGroup.append('g').attr('class', 'x-axis');
    this.yAxisGroup = this.chartGroup.append('g').attr('class', 'y-axis');

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

    // Initialize scales
    this.xScale = d3.scalePoint();
    this.yScale = d3.scaleLinear();

    // Initialize line generator
    this.lineGenerator = d3.line()
      .x(d => this.xScale(d.monthLabel))
      .y(d => this.yScale(d.cumulativePL))
      .curve(d3.curveMonotoneX);
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
   * @param {Array} data - Array of monthly P/L objects
   */
  update(data) {
    if (!data || data.length === 0) {
      this._showEmptyState();
      return;
    }

    this.data = data;
    this._render();
  }

  /**
   * Render the chart
   * @private
   */
  _render() {
    // Get container dimensions
    const containerRect = this.container.getBoundingClientRect();
    this.width = containerRect.width - this.margin.left - this.margin.right;
    this.height = containerRect.height - this.margin.top - this.margin.bottom;

    // Update scales
    this.xScale
      .domain(this.data.map(d => d.monthLabel))
      .range([0, this.width])
      .padding(0.5);

    // Calculate y-axis domain with some padding
    const plValues = this.data.map(d => d.cumulativePL);
    const minPL = Math.min(0, ...plValues);
    const maxPL = Math.max(0, ...plValues);
    const padding = Math.abs(maxPL - minPL) * 0.1 || 100;

    this.yScale
      .domain([minPL - padding, maxPL + padding])
      .range([this.height, 0])
      .nice();

    // Render grid lines (Requirement 4.5)
    if (this.options.showGrid) {
      this._renderGrid();
    }

    // Render axes (Requirement 4.5)
    this._renderAxes();

    // Render line (Requirement 4.1)
    this._renderLine();

    // Render dots with hover interaction
    this._renderDots();
  }

  /**
   * Render grid lines
   * @private
   */
  _renderGrid() {
    // Y-axis grid lines
    const yTicks = this.yScale.ticks(6);
    
    const gridLines = this.gridGroup
      .selectAll('.grid-line')
      .data(yTicks);

    gridLines.enter()
      .append('line')
      .attr('class', 'grid-line')
      .merge(gridLines)
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', d => this.yScale(d))
      .attr('y2', d => this.yScale(d))
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2');

    gridLines.exit().remove();

    // Zero line (more prominent)
    const zeroLine = this.gridGroup
      .selectAll('.zero-line')
      .data([0]);

    zeroLine.enter()
      .append('line')
      .attr('class', 'zero-line')
      .merge(zeroLine)
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', this.yScale(0))
      .attr('y2', this.yScale(0))
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 1.5);

    zeroLine.exit().remove();
  }

  /**
   * Render axes with labels
   * @private
   */
  _renderAxes() {
    // X-axis
    const xAxis = d3.axisBottom(this.xScale)
      .tickSize(0)
      .tickPadding(10);

    this.xAxisGroup
      .attr('transform', `translate(0,${this.height})`)
      .call(xAxis)
      .call(g => g.select('.domain').attr('stroke', '#1f2937'));

    // Style x-axis labels
    this.xAxisGroup.selectAll('text')
      .attr('fill', '#9ca3af')
      .attr('font-size', '12px')
      .style('text-anchor', 'end')
      .attr('transform', 'rotate(-45)');

    // Y-axis
    const yAxis = d3.axisLeft(this.yScale)
      .ticks(6)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(d => this._formatCurrency(d));

    this.yAxisGroup
      .call(yAxis)
      .call(g => g.select('.domain').attr('stroke', '#1f2937'));

    // Style y-axis labels
    this.yAxisGroup.selectAll('text')
      .attr('fill', '#9ca3af')
      .attr('font-size', '12px');

    // Add axis labels
    this._addAxisLabels();
  }

  /**
   * Add axis labels
   * @private
   */
  _addAxisLabels() {
    // Remove existing labels
    this.chartGroup.selectAll('.axis-label').remove();

    // Y-axis label
    this.chartGroup.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -this.height / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Cumulative P/L');

    // X-axis label
    this.chartGroup.append('text')
      .attr('class', 'axis-label')
      .attr('x', this.width / 2)
      .attr('y', this.height + 50)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Month');
  }

  /**
   * Render the P/L trend line
   * @private
   */
  _renderLine() {
    // Update line generator
    this.lineGenerator
      .x(d => this.xScale(d.monthLabel))
      .y(d => this.yScale(d.cumulativePL));

    // Bind data
    const line = this.lineGroup
      .selectAll('.pl-line')
      .data([this.data]);

    // Enter + Update
    const lineEnter = line.enter()
      .append('path')
      .attr('class', 'pl-line')
      .attr('fill', 'none')
      .attr('stroke-width', 2.5);

    lineEnter.merge(line)
      .transition()
      .duration(this.options.animationDuration)
      .attr('d', this.lineGenerator)
      .attr('stroke', d => {
        // Color coding: green for positive, red for negative (Requirement 4.3)
        const finalPL = d[d.length - 1].cumulativePL;
        return finalPL >= 0 ? '#10b981' : '#ef4444';
      });

    line.exit().remove();
  }

  /**
   * Render dots for each data point with hover interaction
   * @private
   */
  _renderDots() {
    const dots = this.dotsGroup
      .selectAll('.pl-dot')
      .data(this.data);

    // Enter
    const dotsEnter = dots.enter()
      .append('circle')
      .attr('class', 'pl-dot')
      .attr('r', 0)
      .attr('fill', d => d.cumulativePL >= 0 ? '#10b981' : '#ef4444')
      .attr('stroke', '#141b2d')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Enter + Update
    dotsEnter.merge(dots)
      .on('mouseover', (event, d) => this._showTooltip(event, d))
      .on('mouseout', () => this._hideTooltip())
      .transition()
      .duration(this.options.animationDuration)
      .attr('cx', d => this.xScale(d.monthLabel))
      .attr('cy', d => this.yScale(d.cumulativePL))
      .attr('r', 5)
      .attr('fill', d => d.cumulativePL >= 0 ? '#10b981' : '#ef4444');

    // Exit
    dots.exit()
      .transition()
      .duration(this.options.animationDuration / 2)
      .attr('r', 0)
      .remove();
  }

  /**
   * Show tooltip on hover
   * @param {Event} event - Mouse event
   * @param {Object} data - Data point
   * @private
   */
  _showTooltip(event, data) {
    const plColor = data.cumulativePL >= 0 ? '#10b981' : '#ef4444';
    const monthlyPLColor = data.pl >= 0 ? '#10b981' : '#ef4444';

    this.tooltip
      .style('visibility', 'visible')
      .html(`
        <div style="color: #e5e7eb; font-weight: 600; margin-bottom: 4px;">
          ${data.monthLabel}
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Monthly P/L: <span style="color: ${monthlyPLColor}; font-weight: 600;">${this._formatCurrency(data.pl)}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px;">
          Cumulative: <span style="color: ${plColor}; font-weight: 600;">${this._formatCurrency(data.cumulativePL)}</span>
        </div>
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
   * Show empty state when no data
   * @private
   */
  _showEmptyState() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af;">
        <div style="text-align: center;">
          <div style="font-size: 16px; margin-bottom: 8px;">No P/L data available</div>
          <div style="font-size: 12px;">Upload trades to see your P/L trend</div>
        </div>
      </div>
    `;
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
    
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PLTrendChart;
}
