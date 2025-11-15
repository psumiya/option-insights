/**
 * Scatter Plot Chart Component
 * Renders a scatter plot showing Days Held vs P/L with strategy color coding
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
class ScatterPlotChart {
  /**
   * Create Scatter Plot Chart
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Array} data - Array of {symbol, strategy, daysHeld, pl, type} objects
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
    this.margin = { top: 40, right: 140, bottom: 60, left: 80 };
    this.pointRadius = 6;
    this.options = {
      animationDuration: 750,
      ...options
    };

    // Initialize chart
    this._initChart();
    
    // Set up resize observer (Requirement 4.1)
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
      .attr('class', 'scatter-plot-svg');

    // Create main group for chart content
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Create groups for different chart elements
    this.axesGroup = this.chartGroup.append('g').attr('class', 'axes-group');
    this.zeroLineGroup = this.chartGroup.append('g').attr('class', 'zero-line-group');
    this.pointsGroup = this.chartGroup.append('g').attr('class', 'points-group');
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

    // Initialize color scale for strategies (Requirement 4.3)
    this.colorScale = d3.scaleOrdinal()
      .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']);
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
   * @param {Array} data - Array of trade objects
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
    this._render();
  }

  /**
   * Render the chart
   * @private
   */
  _render() {
    // Get container dimensions
    const containerRect = this.container.getBoundingClientRect();
    this.width = Math.max(containerRect.width - this.margin.left - this.margin.right, 200);
    this.height = Math.max(containerRect.height - this.margin.top - this.margin.bottom, 200);

    // Process data
    this._processData();

    // Create scales (Requirement 4.1)
    this._createScales();

    // Render axes (Requirement 4.1)
    this._renderAxes();

    // Render zero reference line (Requirement 4.6)
    this._renderZeroLine();

    // Render scatter points (Requirement 4.2)
    this._renderPoints();

    // Render legend (Requirement 4.5)
    this._renderLegend();
  }

  /**
   * Process and validate data
   * @private
   */
  _processData() {
    // Filter out invalid data and ensure numeric values
    this.processedData = this.data.filter(d => 
      d.daysHeld != null && 
      d.pl != null && 
      !isNaN(d.daysHeld) && 
      !isNaN(d.pl)
    );

    // Get unique strategies for color scale
    this.strategies = [...new Set(this.processedData.map(d => d.strategy))].sort();
    this.colorScale.domain(this.strategies);
  }

  /**
   * Create X and Y scales
   * @private
   */
  _createScales() {
    // X-axis: Days Held (Requirement 4.1)
    const maxDaysHeld = d3.max(this.processedData, d => d.daysHeld) || 60;
    this.xScale = d3.scaleLinear()
      .domain([0, Math.max(maxDaysHeld, 10)])
      .range([0, this.width])
      .nice();

    // Y-axis: P/L (Requirement 4.1)
    const plExtent = d3.extent(this.processedData, d => d.pl);
    const plPadding = (plExtent[1] - plExtent[0]) * 0.1 || 100;
    this.yScale = d3.scaleLinear()
      .domain([plExtent[0] - plPadding, plExtent[1] + plPadding])
      .range([this.height, 0])
      .nice();
  }

  /**
   * Render X and Y axes with labels
   * @private
   */
  _renderAxes() {
    // Clear existing axes
    this.axesGroup.selectAll('*').remove();

    // X-axis
    const xAxis = d3.axisBottom(this.xScale)
      .ticks(8)
      .tickFormat(d => d.toFixed(0));

    this.axesGroup.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${this.height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#9ca3af')
      .attr('font-size', '11px');

    this.axesGroup.selectAll('.x-axis path, .x-axis line')
      .attr('stroke', '#374151');

    // X-axis label
    this.axesGroup.append('text')
      .attr('class', 'x-axis-label')
      .attr('x', this.width / 2)
      .attr('y', this.height + 45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .text('Days Held');

    // Y-axis
    const yAxis = d3.axisLeft(this.yScale)
      .ticks(8)
      .tickFormat(d => this._formatCurrency(d));

    this.axesGroup.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#9ca3af')
      .attr('font-size', '11px');

    this.axesGroup.selectAll('.y-axis path, .y-axis line')
      .attr('stroke', '#374151');

    // Y-axis label
    this.axesGroup.append('text')
      .attr('class', 'y-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -this.height / 2)
      .attr('y', -60)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .text('P/L ($)');
  }

  /**
   * Render horizontal zero reference line
   * @private
   */
  _renderZeroLine() {
    // Clear existing zero line
    this.zeroLineGroup.selectAll('*').remove();

    // Only render if zero is within the Y-axis range
    const yDomain = this.yScale.domain();
    if (yDomain[0] <= 0 && yDomain[1] >= 0) {
      this.zeroLineGroup.append('line')
        .attr('class', 'zero-line')
        .attr('x1', 0)
        .attr('x2', this.width)
        .attr('y1', this.yScale(0))
        .attr('y2', this.yScale(0))
        .attr('stroke', '#6b7280')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.6);
    }
  }

  /**
   * Render scatter plot points
   * @private
   */
  _renderPoints() {
    // Bind data (Requirement 4.2)
    const points = this.pointsGroup
      .selectAll('.scatter-point')
      .data(this.processedData, (d, i) => `${d.symbol}-${d.strategy}-${i}`);

    // Enter
    const pointsEnter = points.enter()
      .append('circle')
      .attr('class', 'scatter-point')
      .attr('r', 0)
      .attr('cx', d => this.xScale(d.daysHeld))
      .attr('cy', d => this.yScale(d.pl))
      .attr('fill', d => this.colorScale(d.strategy))
      .attr('stroke', '#141b2d')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.7)
      .style('cursor', 'pointer');

    // Enter + Update
    pointsEnter.merge(points)
      .on('mouseover', (event, d) => this._showTooltip(event, d))
      .on('mouseout', () => this._hideTooltip())
      .transition()
      .duration(this.options.animationDuration)
      .attr('cx', d => this.xScale(d.daysHeld))
      .attr('cy', d => this.yScale(d.pl))
      .attr('fill', d => this.colorScale(d.strategy))
      .attr('r', this.pointRadius);

    // Exit
    points.exit()
      .transition()
      .duration(this.options.animationDuration / 2)
      .attr('r', 0)
      .attr('opacity', 0)
      .remove();
  }

  /**
   * Render legend for strategy colors
   * @private
   */
  _renderLegend() {
    // Clear existing legend
    this.legendGroup.selectAll('*').remove();

    // Position legend to the right of the chart
    const legendX = this.width + 20;
    const legendY = 0;
    const itemHeight = 24;

    // Add legend title
    this.legendGroup.append('text')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('fill', '#e5e7eb')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .text('Strategy');

    // Add legend items
    this.strategies.forEach((strategy, i) => {
      const itemY = legendY + 20 + (i * itemHeight);

      // Color circle
      this.legendGroup.append('circle')
        .attr('cx', legendX + 6)
        .attr('cy', itemY)
        .attr('r', 5)
        .attr('fill', this.colorScale(strategy))
        .attr('stroke', '#141b2d')
        .attr('stroke-width', 1);

      // Strategy label
      this.legendGroup.append('text')
        .attr('x', legendX + 18)
        .attr('y', itemY)
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '11px')
        .text(strategy);
    });
  }

  /**
   * Show tooltip on hover (Requirement 4.4)
   * @param {Event} event - Mouse event
   * @param {Object} data - Point data
   * @private
   */
  _showTooltip(event, data) {
    const plColor = data.pl >= 0 ? '#10b981' : '#ef4444';

    this.tooltip
      .style('visibility', 'visible')
      .html(`
        <div style="color: #e5e7eb; font-weight: 600; margin-bottom: 4px;">
          ${data.symbol}
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Strategy: <span style="color: #e5e7eb; font-weight: 600;">${data.strategy}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Days Held: <span style="color: #e5e7eb; font-weight: 600;">${data.daysHeld}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px;">
          P/L: <span style="color: ${plColor}; font-weight: 600;">${this._formatCurrency(data.pl)}</span>
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
    if (this.pointsGroup) this.pointsGroup.selectAll('*').remove();
    if (this.axesGroup) this.axesGroup.selectAll('*').remove();
    if (this.zeroLineGroup) this.zeroLineGroup.selectAll('*').remove();
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
        .text('No scatter plot data available');
      
      this.chartGroup.append('text')
        .attr('class', 'empty-state-text')
        .attr('x', width / 2)
        .attr('y', height / 2 + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '12px')
        .text('Upload trades with close dates to see holding period analysis');
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
  module.exports = ScatterPlotChart;
}
