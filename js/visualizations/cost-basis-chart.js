/**
 * Cost Basis Chart Component
 * Displays cost basis per symbol with open position tracking
 */
class CostBasisChart {
  /**
   * Create Cost Basis Chart
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Array} data - Array of cost basis objects
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
    this.margin = { top: 20, right: 30, bottom: 50, left: 100 };
    this.options = {
      animationDuration: 750,
      maxBars: 50,
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
      .attr('class', 'cost-basis-svg');

    // Create main group for chart content
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Create groups for different chart elements
    this.barsGroup = this.chartGroup.append('g').attr('class', 'bars-group');
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
   * @param {Array} data - Array of cost basis objects
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

    // Sort by cost basis descending
    this.data = [...data].sort((a, b) => b.costBasis - a.costBasis);
    
    // Limit to maxBars
    if (this.data.length > this.options.maxBars) {
      this.data = this.data.slice(0, this.options.maxBars);
    }

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

    // Extract symbols from data
    const symbols = this.data.map(d => d.symbol);

    // Update scales
    this.yScale
      .domain(symbols)
      .range([0, this.height])
      .padding(0.2);

    // Calculate x-axis domain with padding (cost basis is always positive)
    const maxCostBasis = Math.max(...this.data.map(d => d.costBasis));
    const padding = maxCostBasis * 0.1 || 100;

    this.xScale
      .domain([0, maxCostBasis + padding])
      .range([0, this.width])
      .nice();

    // Render axes
    this._renderAxes();

    // Render bars
    this._renderBars();
  }

  /**
   * Render axes with labels
   * @private
   */
  _renderAxes() {
    // X-axis
    const xAxis = d3.axisBottom(this.xScale)
      .ticks(6)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(d => '$' + d.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ','));

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
      .attr('font-size', '12px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '600');

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
      .text('Cost Basis ($)');

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
      .selectAll('.cost-basis-bar')
      .data(this.data, d => d.symbol);

    // Enter
    const barsEnter = bars.enter()
      .append('rect')
      .attr('class', 'cost-basis-bar')
      .attr('y', (d, i) => this.yScale(symbols[i]))
      .attr('x', 0)
      .attr('width', 0)
      .attr('height', this.yScale.bandwidth())
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
      .attr('width', d => this.xScale(d.costBasis))
      .attr('height', this.yScale.bandwidth())
      .attr('fill', d => d.hasOpenPosition ? '#3b82f6' : '#6b7280'); // Blue for open positions, gray for closed

    // Exit
    bars.exit()
      .transition()
      .duration(this.options.animationDuration / 2)
      .attr('width', 0)
      .remove();
  }

  /**
   * Show tooltip on hover
   * @param {Event} event - Mouse event
   * @param {Object} data - Bar data
   * @private
   */
  _showTooltip(event, data) {
    const statusColor = data.hasOpenPosition ? '#3b82f6' : '#6b7280';
    const statusText = data.hasOpenPosition ? 'Open Position' : 'No Open Position';

    this.tooltip
      .style('visibility', 'visible')
      .html(`
        <div style="color: #e5e7eb; font-weight: 600; margin-bottom: 6px;">
          ${data.symbol}
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Cost Basis: <span style="color: #e5e7eb; font-weight: 600;">$${data.costBasis.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Total Trades: <span style="color: #e5e7eb; font-weight: 600;">${data.totalTrades}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Debit Trades: <span style="color: #e5e7eb; font-weight: 600;">${data.debitTrades}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Open Positions: <span style="color: #e5e7eb; font-weight: 600;">${data.openPositions}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px;">
          Status: <span style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
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
   * Show empty state when no data
   * @private
   */
  _showEmptyState() {
    // Clear chart groups but keep SVG structure
    if (this.barsGroup) this.barsGroup.selectAll('*').remove();
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
        .text('No cost basis data available');
      
      this.chartGroup.append('text')
        .attr('class', 'empty-state-text')
        .attr('x', width / 2)
        .attr('y', height / 2 + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '12px')
        .text('Only shows symbols with debit trades (money spent)');
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
  module.exports = CostBasisChart;
}
