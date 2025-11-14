/**
 * Top Underlyings Chart Component
 * Renders a horizontal bar chart showing top 5 symbols by winning dollars
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.7
 */
class TopUnderlyingsChart {
  /**
   * Create Top Underlyings Chart
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Array} data - Array of {symbol, winningDollars, winCount} objects
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
    this.margin = { top: 20, right: 80, bottom: 50, left: 100 };
    this.options = {
      animationDuration: 750,
      maxSymbols: 5, // Top 5 symbols (Requirement 15.1)
      barColor: '#10b981', // Green for all bars (Requirement 15.5)
      ...options
    };

    // Initialize chart
    this._initChart();
    
    // Set up resize observer
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
      .attr('class', 'top-underlyings-svg');

    // Create main group for chart content
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Create groups for different chart elements
    this.barsGroup = this.chartGroup.append('g').attr('class', 'bars-group');
    this.labelsGroup = this.chartGroup.append('g').attr('class', 'labels-group');
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
    this.xScale = d3.scaleLinear();
    this.yScale = d3.scaleBand();
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
   * @param {Array} data - Array of top underlying objects
   */
  update(data) {
    if (!data || data.length === 0) {
      this._showEmptyState();
      return;
    }

    // Remove empty state if it exists
    if (this.chartGroup) {
      this.chartGroup.selectAll('.empty-state-text').remove();
    }

    // Sort by winning dollars descending and take top 5 (Requirement 15.3)
    // Handle cases with fewer than 5 symbols (Requirement 15.7)
    this.data = [...data]
      .sort((a, b) => b.winningDollars - a.winningDollars)
      .slice(0, this.options.maxSymbols);

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

    // Extract symbols from data (Requirement 15.4)
    const symbols = this.data.map(d => d.symbol);

    // Update scales
    // Y-axis: symbols (highest at top) (Requirement 15.3)
    this.yScale
      .domain(symbols)
      .range([0, this.height])
      .padding(0.3);

    // X-axis: winning dollars (Requirement 15.4)
    const maxWinning = this.data.length > 0
      ? Math.max(...this.data.map(d => d.winningDollars))
      : 100; // Default to 100 if no data to avoid invalid scale
    this.xScale
      .domain([0, maxWinning * 1.15]) // Add 15% padding for labels
      .range([0, this.width])
      .nice();

    // Render axes
    this._renderAxes();

    // Render bars (Requirement 15.4)
    this._renderBars();

    // Render dollar amount labels at end of bars (Requirement 15.5)
    this._renderValueLabels();
  }

  /**
   * Render axes with labels
   * @private
   */
  _renderAxes() {
    // X-axis
    const xAxis = d3.axisBottom(this.xScale)
      .ticks(5)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(d => this._formatCurrency(d, false)); // No sign for x-axis

    this.xAxisGroup
      .attr('transform', `translate(0,${this.height})`)
      .call(xAxis)
      .call(g => g.select('.domain').attr('stroke', '#1f2937'));

    // Style x-axis labels
    this.xAxisGroup.selectAll('text')
      .attr('fill', '#9ca3af')
      .attr('font-size', '12px');

    // Y-axis
    const yAxis = d3.axisLeft(this.yScale)
      .tickSize(0)
      .tickPadding(10);

    this.yAxisGroup
      .call(yAxis)
      .call(g => g.select('.domain').attr('stroke', '#1f2937'));

    // Style y-axis labels
    this.yAxisGroup.selectAll('text')
      .attr('fill', '#9ca3af')
      .attr('font-size', '13px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '700');

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

    // X-axis label
    this.chartGroup.append('text')
      .attr('class', 'axis-label')
      .attr('x', this.width / 2)
      .attr('y', this.height + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Winning Dollars ($)');

    // Y-axis label
    this.chartGroup.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -this.height / 2)
      .attr('y', -85)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Symbol');
  }

  /**
   * Render horizontal bars
   * @private
   */
  _renderBars() {
    const symbols = this.data.map(d => d.symbol);

    // Bind data
    const bars = this.barsGroup
      .selectAll('.top-underlying-bar')
      .data(this.data, d => d.symbol);

    // Enter
    const barsEnter = bars.enter()
      .append('rect')
      .attr('class', 'top-underlying-bar')
      .attr('y', (d, i) => this.yScale(symbols[i]))
      .attr('x', 0)
      .attr('width', 0)
      .attr('height', this.yScale.bandwidth())
      .attr('fill', this.options.barColor)
      .attr('opacity', 0.9)
      .style('cursor', 'pointer');

    // Enter + Update with animation
    barsEnter.merge(bars)
      .on('mouseover', (event, d) => this._showTooltip(event, d))
      .on('mouseout', () => this._hideTooltip())
      .transition()
      .duration(this.options.animationDuration)
      .attr('y', (d, i) => this.yScale(symbols[i]))
      .attr('x', 0)
      .attr('width', d => Math.max(0, this.xScale(d.winningDollars)))
      .attr('height', this.yScale.bandwidth());

    // Exit
    bars.exit()
      .transition()
      .duration(this.options.animationDuration / 2)
      .attr('width', 0)
      .remove();
  }

  /**
   * Render value labels at the end of bars (Requirement 15.5)
   * @private
   */
  _renderValueLabels() {
    const symbols = this.data.map(d => d.symbol);

    // Bind data
    const labels = this.labelsGroup
      .selectAll('.value-label')
      .data(this.data, d => d.symbol);

    // Enter
    const labelsEnter = labels.enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('y', (d, i) => this.yScale(symbols[i]) + this.yScale.bandwidth() / 2)
      .attr('x', 0)
      .attr('dy', '0.35em')
      .attr('dx', '8')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('opacity', 0);

    // Enter + Update
    labelsEnter.merge(labels)
      .transition()
      .duration(this.options.animationDuration)
      .attr('y', (d, i) => this.yScale(symbols[i]) + this.yScale.bandwidth() / 2)
      .attr('x', d => this.xScale(d.winningDollars))
      .attr('opacity', 1)
      .text(d => this._formatCurrency(d.winningDollars, true));

    // Exit
    labels.exit()
      .transition()
      .duration(this.options.animationDuration / 2)
      .attr('opacity', 0)
      .remove();
  }

  /**
   * Show tooltip on hover (Requirement 15.5)
   * @param {Event} event - Mouse event
   * @param {Object} data - Bar data
   * @private
   */
  _showTooltip(event, data) {
    this.tooltip
      .style('visibility', 'visible')
      .html(`
        <div style="color: #e5e7eb; font-weight: 600; margin-bottom: 6px;">
          ${data.symbol}
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Winning $: <span style="color: ${this.options.barColor}; font-weight: 600;">${this._formatCurrency(data.winningDollars, true)}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px;">
          Win Count: <span style="color: #e5e7eb; font-weight: 600;">${data.winCount}</span>
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
   * @param {boolean} includeSign - Whether to include + sign for positive values
   * @returns {string} - Formatted currency string
   * @private
   */
  _formatCurrency(value, includeSign = false) {
    const sign = (includeSign && value >= 0) ? '+' : '';
    return sign + '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Show empty state when no data
   * @private
   */
  _showEmptyState() {
    // Clear chart groups but keep SVG structure
    if (this.barsGroup) this.barsGroup.selectAll('*').remove();
    if (this.labelsGroup) this.labelsGroup.selectAll('*').remove();
    if (this.xAxisGroup) this.xAxisGroup.selectAll('*').remove();
    if (this.yAxisGroup) this.yAxisGroup.selectAll('*').remove();
    
    // Add empty state message
    if (this.chartGroup) {
      this.chartGroup.selectAll('.empty-state-text').remove();
      this.chartGroup.selectAll('.axis-label').remove();
      
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
        .text('No winning trades data available');
      
      this.chartGroup.append('text')
        .attr('class', 'empty-state-text')
        .attr('x', width / 2)
        .attr('y', height / 2 + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '12px')
        .text('Upload trades to see top performing symbols');
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
    
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TopUnderlyingsChart;
}
