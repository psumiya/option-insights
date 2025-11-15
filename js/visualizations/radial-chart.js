/**
 * Radial Chart Component
 * Renders a radial area chart showing strategy performance by month
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
class RadialChart {
  /**
   * Create Radial Chart
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Array} data - Array of {month, strategies: [{strategy, pl}]} objects
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
    this.margin = { top: 80, right: 180, bottom: 80, left: 180 };
    this.options = {
      animationDuration: 750,
      monthsToShow: 12, // Requirement 8.6
      ...options
    };

    // Initialize chart
    this._initChart();
    
    // Set up resize observer (Requirement 8.1)
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
      .attr('class', 'radial-chart-svg');

    // Create main group for chart content
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-content');

    // Create groups for different chart elements
    this.areasGroup = this.chartGroup.append('g').attr('class', 'areas-group');
    this.axesGroup = this.chartGroup.append('g').attr('class', 'axes-group');
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

    // Initialize color scale for strategies (Requirement 8.2)
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
   * @param {Array} data - Array of month objects with strategy P/L
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
    const width = containerRect.width;
    const height = containerRect.height;

    // Calculate radius based on available space
    const radius = Math.max(Math.min(
      width - this.margin.left - this.margin.right,
      height - this.margin.top - this.margin.bottom
    ) / 2, 100);

    // Center the chart
    const centerX = width / 2;
    const centerY = height / 2;
    
    this.chartGroup.attr('transform', `translate(${centerX},${centerY})`);

    // Process data
    this._processData();

    // Create scales (Requirement 8.1, 8.2)
    this._createScales(radius);

    // Render radial axes
    this._renderAxes(radius);

    // Render radial areas (Requirement 8.2)
    this._renderAreas();

    // Render legend (Requirement 8.5)
    this._renderLegend(width, height);
  }

  /**
   * Process and validate data
   * @private
   */
  _processData() {
    // Get all unique strategies across all months
    const strategiesSet = new Set();
    this.data.forEach(monthData => {
      monthData.strategies.forEach(s => strategiesSet.add(s.strategy));
    });
    this.strategies = Array.from(strategiesSet);

    // Update color scale domain
    this.colorScale.domain(this.strategies);

    // Transform data into format suitable for radial rendering
    // Each strategy gets an array of {month, pl} values
    this.strategyData = this.strategies.map(strategy => {
      const values = this.data.map(monthData => {
        const strategyEntry = monthData.strategies.find(s => s.strategy === strategy);
        return {
          month: monthData.month,
          pl: strategyEntry ? strategyEntry.pl : 0
        };
      });
      return {
        strategy,
        values
      };
    });
  }

  /**
   * Create radial and angular scales
   * @private
   */
  _createScales(radius) {
    // Angular scale: months arranged evenly around the circle (Requirement 8.1)
    const months = this.data.map(d => d.month);
    
    // Use scaleBand with padding 0 to evenly distribute points around full circle
    // This ensures N months get N evenly-spaced positions covering the full 2π
    this.angleScale = d3.scaleBand()
      .domain(months)
      .range([0, 2 * Math.PI])
      .paddingInner(0)
      .paddingOuter(0);
    
    // Helper to get center angle for each month
    this.getAngle = (month) => {
      const bandwidth = this.angleScale.bandwidth();
      return this.angleScale(month) + bandwidth / 2;
    };

    // Radial scale: P/L magnitude (Requirement 8.3)
    const allPLValues = this.strategyData.flatMap(s => s.values.map(v => v.pl));
    const maxAbsPL = d3.max(allPLValues.map(Math.abs)) || 100;
    
    this.radiusScale = d3.scaleLinear()
      .domain([0, maxAbsPL])
      .range([0, radius * 0.8]) // Leave some margin
      .nice();
  }

  /**
   * Render radial axes and month labels
   * @private
   */
  _renderAxes(radius) {
    // Clear existing axes
    this.axesGroup.selectAll('*').remove();

    // Draw concentric circles for radial grid
    const radiusTicks = this.radiusScale.ticks(4);
    
    this.axesGroup.selectAll('.radial-grid')
      .data(radiusTicks)
      .enter()
      .append('circle')
      .attr('class', 'radial-grid')
      .attr('r', d => this.radiusScale(d))
      .attr('fill', 'none')
      .attr('stroke', '#374151')
      .attr('stroke-width', 1)
      .attr('opacity', 0.3);

    // Add radial grid labels
    this.axesGroup.selectAll('.radial-label')
      .data(radiusTicks.slice(1)) // Skip 0
      .enter()
      .append('text')
      .attr('class', 'radial-label')
      .attr('x', 5)
      .attr('y', d => -this.radiusScale(d))
      .attr('dy', '0.35em')
      .attr('fill', '#9ca3af')
      .attr('font-size', '10px')
      .text(d => this._formatCurrency(d));

    // Draw month axes and labels (Requirement 8.1)
    const months = this.data.map(d => d.month);
    
    months.forEach(month => {
      const angle = this.getAngle(month);
      const x = Math.cos(angle - Math.PI / 2) * radius;
      const y = Math.sin(angle - Math.PI / 2) * radius;

      // Draw axis line
      this.axesGroup.append('line')
        .attr('class', 'month-axis')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#374151')
        .attr('stroke-width', 1)
        .attr('opacity', 0.3);

      // Add month label
      const labelRadius = radius + 20;
      const labelX = Math.cos(angle - Math.PI / 2) * labelRadius;
      const labelY = Math.sin(angle - Math.PI / 2) * labelRadius;

      this.axesGroup.append('text')
        .attr('class', 'month-label')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#e5e7eb')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .text(month);
    });
  }

  /**
   * Render radial area layers for each strategy
   * @private
   */
  _renderAreas() {
    // Clear existing areas
    this.areasGroup.selectAll('*').remove();

    // Create radial line generator (Requirement 8.2)
    const radialLine = d3.lineRadial()
      .angle(d => this.getAngle(d.month))
      .radius(d => this.radiusScale(Math.abs(d.pl)))
      .curve(d3.curveCardinalClosed.tension(0.5));

    // Render each strategy as a layer
    this.strategyData.forEach((strategyData, index) => {
      const path = this.areasGroup.append('path')
        .datum(strategyData.values)
        .attr('class', `radial-area strategy-${index}`)
        .attr('d', radialLine)
        .attr('fill', this.colorScale(strategyData.strategy))
        .attr('fill-opacity', 0.3)
        .attr('stroke', this.colorScale(strategyData.strategy))
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => this._showTooltip(event, strategyData))
        .on('mousemove', (event) => this._moveTooltip(event))
        .on('mouseout', () => this._hideTooltip());

      // Animate path drawing
      const totalLength = path.node().getTotalLength();
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(this.options.animationDuration)
        .delay(index * 100)
        .attr('stroke-dashoffset', 0);

      // Add data points
      strategyData.values.forEach(value => {
        const angle = this.getAngle(value.month);
        const r = this.radiusScale(Math.abs(value.pl));
        const x = Math.cos(angle - Math.PI / 2) * r;
        const y = Math.sin(angle - Math.PI / 2) * r;

        this.areasGroup.append('circle')
          .attr('class', `data-point strategy-${index}`)
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 0)
          .attr('fill', this.colorScale(strategyData.strategy))
          .attr('stroke', '#141b2d')
          .attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .on('mouseover', (event) => this._showPointTooltip(event, strategyData.strategy, value))
          .on('mousemove', (event) => this._moveTooltip(event))
          .on('mouseout', () => this._hideTooltip())
          .transition()
          .duration(this.options.animationDuration)
          .delay(index * 100)
          .attr('r', 4);
      });
    });
  }

  /**
   * Render legend outside the circle
   * @private
   */
  _renderLegend(width, height) {
    // Clear existing legend
    this.legendGroup.selectAll('*').remove();

    // Position legend on the right side (Requirement 8.5)
    const legendX = width - this.margin.right + 20;
    const legendY = height / 2 - (this.strategies.length * 25) / 2;

    this.legendGroup.attr('transform', `translate(${legendX},${legendY})`);

    // Add legend items
    const legendItems = this.legendGroup.selectAll('.legend-item')
      .data(this.strategies)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0,${i * 25})`)
      .style('cursor', 'pointer')
      .on('mouseover', (event, strategy) => {
        // Highlight corresponding area
        this.areasGroup.selectAll('path, circle')
          .style('opacity', d => {
            if (Array.isArray(d)) {
              // For paths
              const strategyData = this.strategyData.find(s => s.values === d);
              return strategyData && strategyData.strategy === strategy ? 1 : 0.2;
            }
            return 0.2;
          });
      })
      .on('mouseout', () => {
        // Reset opacity
        this.areasGroup.selectAll('path, circle')
          .style('opacity', 1);
      });

    // Legend color box
    legendItems.append('rect')
      .attr('width', 16)
      .attr('height', 16)
      .attr('fill', d => this.colorScale(d))
      .attr('rx', 2);

    // Legend text
    legendItems.append('text')
      .attr('x', 24)
      .attr('y', 8)
      .attr('dy', '0.35em')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '12px')
      .text(d => d);
  }

  /**
   * Show tooltip for strategy area (Requirement 8.4)
   * @param {Event} event - Mouse event
   * @param {Object} strategyData - Strategy data object
   * @private
   */
  _showTooltip(event, strategyData) {
    const totalPL = strategyData.values.reduce((sum, v) => sum + v.pl, 0);
    const avgPL = totalPL / strategyData.values.length;

    this.tooltip
      .style('visibility', 'visible')
      .html(`
        <div style="color: #e5e7eb; font-weight: 600; margin-bottom: 6px; font-size: 13px;">
          ${strategyData.strategy}
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Total P/L: <span style="color: ${totalPL >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">
            ${this._formatCurrency(totalPL)}
          </span>
        </div>
        <div style="color: #9ca3af; font-size: 11px;">
          Avg P/L: <span style="color: ${avgPL >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">
            ${this._formatCurrency(avgPL)}
          </span>
        </div>
      `);

    this._moveTooltip(event);
  }

  /**
   * Show tooltip for individual data point (Requirement 8.4)
   * @param {Event} event - Mouse event
   * @param {string} strategy - Strategy name
   * @param {Object} value - Data point value
   * @private
   */
  _showPointTooltip(event, strategy, value) {
    this.tooltip
      .style('visibility', 'visible')
      .html(`
        <div style="color: #e5e7eb; font-weight: 600; margin-bottom: 6px; font-size: 13px;">
          ${strategy}
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Month: <span style="color: #e5e7eb; font-weight: 600;">${value.month}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px;">
          P/L: <span style="color: ${value.pl >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">
            ${this._formatCurrency(value.pl)}
          </span>
        </div>
      `);

    this._moveTooltip(event);
  }

  /**
   * Move tooltip to follow cursor
   * @param {Event} event - Mouse event
   * @private
   */
  _moveTooltip(event) {
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
    if (this.areasGroup) this.areasGroup.selectAll('*').remove();
    if (this.axesGroup) this.axesGroup.selectAll('*').remove();
    if (this.legendGroup) this.legendGroup.selectAll('*').remove();
    
    // Add empty state message to chart group
    if (this.chartGroup) {
      this.chartGroup.selectAll('.empty-state-text').remove();
      
      this.chartGroup.append('text')
        .attr('class', 'empty-state-text')
        .attr('x', 0)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '16px')
        .text('No monthly performance data available');
      
      this.chartGroup.append('text')
        .attr('class', 'empty-state-text')
        .attr('x', 0)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '12px')
        .text('Upload trades with close dates to see strategy performance by month');
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
  module.exports = RadialChart;
}
