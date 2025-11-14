/**
 * Strategy Performance Chart Component
 * Renders a grouped bar chart showing P/L by Type (buy/sell) and Strategy
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
class StrategyPerformanceChart {
  /**
   * Create Strategy Performance Chart
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Array} data - Array of strategy performance objects
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
    this.margin = { top: 20, right: 120, bottom: 120, left: 100 };
    this.options = {
      showLegend: true,
      animationDuration: 750,
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
      .attr('class', 'strategy-performance-svg');

    // Create main group for chart content
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Create groups for different chart elements
    this.barsGroup = this.chartGroup.append('g').attr('class', 'bars-group');
    this.xAxisGroup = this.chartGroup.append('g').attr('class', 'x-axis');
    this.yAxisGroup = this.chartGroup.append('g').attr('class', 'y-axis');
    this.legendGroup = this.svg.append('g').attr('class', 'legend-group');

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
    this.xScale = d3.scaleBand();
    this.yScale = d3.scaleLinear();
    this.colorScale = d3.scaleOrdinal()
      .domain(['Call', 'Put'])
      .range(['#3b82f6', '#f59e0b']); // Blue for Call, Amber for Put
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
   * @param {Array} data - Array of strategy performance objects
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
      .domain(this.data.map(d => d.strategy))
      .range([0, this.width])
      .padding(0.3);

    // Calculate max absolute value for y-axis (Requirements 6.1, 6.2)
    const maxPL = this.data.length > 0
      ? Math.max(...this.data.map(d => Math.max(Math.abs(d.callPL || 0), Math.abs(d.putPL || 0))))
      : 100; // Default to 100 if no data to avoid invalid scale
    const yMax = maxPL * 1.1; // Add 10% padding

    this.yScale
      .domain([-yMax, yMax])
      .range([this.height, 0])
      .nice();

    // Render axes
    this._renderAxes();

    // Render grouped bars (Requirement 6.3)
    this._renderBars();

    // Render legend (Requirement 6.3)
    if (this.options.showLegend) {
      this._renderLegend();
    }
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
      .ticks(8)
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

    // Add zero line for reference
    this.chartGroup.selectAll('.zero-line').remove();
    this.chartGroup.append('line')
      .attr('class', 'zero-line')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', this.yScale(0))
      .attr('y2', this.yScale(0))
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4');

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
      .attr('y', -85)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Profit/Loss ($)');

    // X-axis label
    this.chartGroup.append('text')
      .attr('class', 'axis-label')
      .attr('x', this.width / 2)
      .attr('y', this.height + 110)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Strategy');
  }

  /**
   * Render grouped bars for Call and Put types
   * @private
   */
  _renderBars() {
    const barWidth = Math.max(0, this.xScale.bandwidth() / 2);
    const zeroY = this.yScale(0);

    // Prepare data for bars (Requirement 6.1, 6.2)
    const barsData = [];
    this.data.forEach(d => {
      barsData.push({
        strategy: d.strategy,
        type: 'Call',
        pl: d.callPL || 0,
        tradeCount: d.callCount || 0
      });
      barsData.push({
        strategy: d.strategy,
        type: 'Put',
        pl: d.putPL || 0,
        tradeCount: d.putCount || 0
      });
    });

    // Bind data
    const bars = this.barsGroup
      .selectAll('.strategy-performance-bar')
      .data(barsData, d => `${d.strategy}-${d.type}`);

    // Enter
    const barsEnter = bars.enter()
      .append('rect')
      .attr('class', 'strategy-performance-bar')
      .attr('x', d => {
        const baseX = this.xScale(d.strategy);
        return d.type === 'Call' ? baseX : baseX + barWidth;
      })
      .attr('y', zeroY)
      .attr('width', barWidth)
      .attr('height', 0)
      .attr('fill', d => this.colorScale(d.type))
      .attr('opacity', 0.9)
      .style('cursor', 'pointer');

    // Enter + Update with animation
    barsEnter.merge(bars)
      .on('mouseover', (event, d) => this._showTooltip(event, d))
      .on('mouseout', () => this._hideTooltip())
      .transition()
      .duration(this.options.animationDuration)
      .attr('x', d => {
        const baseX = this.xScale(d.strategy);
        return d.type === 'Call' ? baseX : baseX + barWidth;
      })
      .attr('y', d => {
        // Bars grow up from zero for positive, down for negative
        return d.pl >= 0 ? this.yScale(d.pl) : zeroY;
      })
      .attr('width', barWidth)
      .attr('height', d => Math.abs(this.yScale(d.pl) - zeroY))
      .attr('fill', d => this.colorScale(d.type));

    // Exit
    bars.exit()
      .transition()
      .duration(this.options.animationDuration / 2)
      .attr('y', zeroY)
      .attr('height', 0)
      .remove();
  }

  /**
   * Render legend
   * @private
   */
  _renderLegend() {
    const legendData = [
      { label: 'Call', color: '#3b82f6' },
      { label: 'Put', color: '#f59e0b' }
    ];

    const legendX = this.margin.left + this.width + 20;
    const legendY = this.margin.top;

    // Remove existing legend items
    this.legendGroup.selectAll('.legend-item').remove();

    const legendItems = this.legendGroup
      .selectAll('.legend-item')
      .data(legendData);

    const legendEnter = legendItems.enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(${legendX}, ${legendY + i * 25})`);

    // Add colored rectangles
    legendEnter.append('rect')
      .attr('width', 16)
      .attr('height', 16)
      .attr('fill', d => d.color)
      .attr('opacity', 0.9);

    // Add labels
    legendEnter.append('text')
      .attr('x', 22)
      .attr('y', 12)
      .attr('fill', '#e5e7eb')
      .attr('font-size', '12px')
      .text(d => d.label);
  }

  /**
   * Show tooltip on hover (Requirement 6.3)
   * @param {Event} event - Mouse event
   * @param {Object} data - Bar data
   * @private
   */
  _showTooltip(event, data) {
    const plColor = data.pl >= 0 ? '#10b981' : '#ef4444';

    this.tooltip
      .style('visibility', 'visible')
      .html(`
        <div style="color: #e5e7eb; font-weight: 600; margin-bottom: 6px;">
          ${data.strategy} - ${data.type}
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          P/L: <span style="color: ${plColor}; font-weight: 600;">${this._formatCurrency(data.pl)}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px;">
          Trades: <span style="color: #e5e7eb; font-weight: 600;">${data.tradeCount}</span>
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
    // Clear chart groups but keep SVG structure
    if (this.barsGroup) this.barsGroup.selectAll('*').remove();
    if (this.xAxisGroup) this.xAxisGroup.selectAll('*').remove();
    if (this.yAxisGroup) this.yAxisGroup.selectAll('*').remove();
    if (this.legendGroup) this.legendGroup.selectAll('*').remove();
    
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
        .text('No strategy performance data available');
      
      this.chartGroup.append('text')
        .attr('class', 'empty-state-text')
        .attr('x', width / 2)
        .attr('y', height / 2 + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '12px')
        .text('Upload trades to see buy vs sell performance');
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
  module.exports = StrategyPerformanceChart;
}
