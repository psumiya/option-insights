/**
 * Violin Plot Chart Component
 * Renders a violin plot showing P/L distribution by strategy with box plot overlay
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
class ViolinPlotChart {
  /**
   * Create Violin Plot Chart
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Array} data - Array of {strategy, plValues, median, mean, q1, q3, min, max, stdDev} objects
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
    this.margin = { top: 40, right: 40, bottom: 80, left: 80 };
    this.violinWidth = 120; // Increased from 80 for better visibility
    this.boxWidth = 16; // Increased from 12
    this.options = {
      animationDuration: 750,
      densityBins: 50,
      ...options
    };

    // Initialize chart
    this._initChart();
    
    // Set up resize observer (Requirement 5.1)
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
      .attr('class', 'violin-plot-svg');

    // Create main group for chart content
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Create groups for different chart elements
    this.axesGroup = this.chartGroup.append('g').attr('class', 'axes-group');
    this.violinsGroup = this.chartGroup.append('g').attr('class', 'violins-group');
    this.boxPlotsGroup = this.chartGroup.append('g').attr('class', 'box-plots-group');

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
   * @param {Array} data - Array of strategy distribution objects
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

    // Create scales (Requirement 5.1, 5.2)
    this._createScales();

    // Render axes (Requirement 5.1, 5.2)
    this._renderAxes();

    // Render violin shapes (Requirement 5.2)
    this._renderViolins();

    // Render box plots (Requirement 5.4)
    this._renderBoxPlots();
  }

  /**
   * Process and validate data
   * @private
   */
  _processData() {
    // Filter out invalid data
    this.processedData = this.data.filter(d => 
      d.strategy && 
      d.plValues && 
      Array.isArray(d.plValues) && 
      d.plValues.length > 0
    );

    // Calculate density distributions for each strategy (Requirement 5.3)
    this.processedData.forEach(d => {
      d.density = this._calculateDensity(d.plValues);
    });
  }

  /**
   * Calculate probability density distribution using kernel density estimation
   * @param {Array} values - Array of P/L values
   * @returns {Array} - Array of {value, density} objects
   * @private
   */
  _calculateDensity(values) {
    if (!values || values.length === 0) return [];

    // Sort values
    const sortedValues = [...values].sort((a, b) => a - b);
    const min = sortedValues[0];
    const max = sortedValues[sortedValues.length - 1];
    const range = max - min;

    // Handle edge case where all values are the same
    if (range === 0) {
      return [{ value: min, density: 1 }];
    }

    // Calculate bandwidth using Silverman's rule of thumb
    const n = values.length;
    const stdDev = d3.deviation(values) || 1;
    const bandwidth = 1.06 * stdDev * Math.pow(n, -0.2);

    // Generate density points
    const densityPoints = [];
    const step = range / this.options.densityBins;
    
    for (let i = 0; i <= this.options.densityBins; i++) {
      const x = min + (i * step);
      let density = 0;

      // Gaussian kernel density estimation
      for (const value of values) {
        const z = (x - value) / bandwidth;
        density += Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
      }

      density = density / (n * bandwidth);
      densityPoints.push({ value: x, density });
    }

    return densityPoints;
  }

  /**
   * Create X and Y scales
   * @private
   */
  _createScales() {
    // X-axis: Strategies (Requirement 5.2)
    this.xScale = d3.scaleBand()
      .domain(this.processedData.map(d => d.strategy))
      .range([0, this.width])
      .padding(0.2); // Reduced padding for more space per violin

    // Y-axis: P/L values (Requirement 5.1)
    const allPLValues = this.processedData.flatMap(d => d.plValues);
    const plExtent = d3.extent(allPLValues);
    const plPadding = (plExtent[1] - plExtent[0]) * 0.1 || 100;
    
    this.yScale = d3.scaleLinear()
      .domain([plExtent[0] - plPadding, plExtent[1] + plPadding])
      .range([this.height, 0])
      .nice();

    // Density scale for violin width
    const maxDensity = d3.max(this.processedData, d => 
      d3.max(d.density, point => point.density)
    );
    
    this.densityScale = d3.scaleLinear()
      .domain([0, maxDensity])
      .range([0, this.violinWidth / 2]);
  }

  /**
   * Render X and Y axes with labels
   * @private
   */
  _renderAxes() {
    // Clear existing axes
    this.axesGroup.selectAll('*').remove();

    // X-axis
    const xAxis = d3.axisBottom(this.xScale);

    this.axesGroup.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${this.height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#9ca3af')
      .attr('font-size', '11px')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .attr('dy', '0.5em');

    this.axesGroup.selectAll('.x-axis path, .x-axis line')
      .attr('stroke', '#374151');

    // X-axis label
    this.axesGroup.append('text')
      .attr('class', 'x-axis-label')
      .attr('x', this.width / 2)
      .attr('y', this.height + 70)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Strategy');

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
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('P/L ($)');

    // Add zero reference line
    if (this.yScale.domain()[0] <= 0 && this.yScale.domain()[1] >= 0) {
      this.axesGroup.append('line')
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
   * Render violin shapes for each strategy
   * @private
   */
  _renderViolins() {
    // Create area generator for violin shape (Requirement 5.2)
    const areaGenerator = d3.area()
      .x0(d => -this.densityScale(d.density))
      .x1(d => this.densityScale(d.density))
      .y(d => this.yScale(d.value))
      .curve(d3.curveBasis);

    // Bind data
    const violins = this.violinsGroup
      .selectAll('.violin')
      .data(this.processedData, d => d.strategy);

    // Enter
    const violinsEnter = violins.enter()
      .append('g')
      .attr('class', 'violin')
      .attr('transform', d => {
        const x = this.xScale(d.strategy) + this.xScale.bandwidth() / 2;
        return `translate(${x},0)`;
      });

    violinsEnter.append('path')
      .attr('class', 'violin-path')
      .attr('d', d => areaGenerator(d.density))
      .attr('fill', '#3b82f6')
      .attr('fill-opacity', 0)
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer');

    // Enter + Update
    const violinsMerge = violinsEnter.merge(violins);

    violinsMerge
      .on('mouseover', (event, d) => this._showTooltip(event, d))
      .on('mouseout', () => this._hideTooltip())
      .transition()
      .duration(this.options.animationDuration)
      .attr('transform', d => {
        const x = this.xScale(d.strategy) + this.xScale.bandwidth() / 2;
        return `translate(${x},0)`;
      });

    violinsMerge.select('.violin-path')
      .transition()
      .duration(this.options.animationDuration)
      .attr('d', d => areaGenerator(d.density))
      .attr('fill-opacity', 0.3); // Semi-transparent blue (Requirement 5.2)

    // Exit
    violins.exit()
      .transition()
      .duration(this.options.animationDuration / 2)
      .attr('opacity', 0)
      .remove();
  }

  /**
   * Render box plots overlaid on violins
   * @private
   */
  _renderBoxPlots() {
    // Bind data
    const boxPlots = this.boxPlotsGroup
      .selectAll('.box-plot')
      .data(this.processedData, d => d.strategy);

    // Enter
    const boxPlotsEnter = boxPlots.enter()
      .append('g')
      .attr('class', 'box-plot')
      .attr('transform', d => {
        const x = this.xScale(d.strategy) + this.xScale.bandwidth() / 2;
        return `translate(${x},0)`;
      });

    // Whiskers (min to Q1, Q3 to max)
    boxPlotsEnter.append('line')
      .attr('class', 'whisker-low')
      .attr('stroke', '#141b2d')
      .attr('stroke-width', 2);

    boxPlotsEnter.append('line')
      .attr('class', 'whisker-high')
      .attr('stroke', '#141b2d')
      .attr('stroke-width', 2);

    // Whisker caps
    boxPlotsEnter.append('line')
      .attr('class', 'whisker-cap-low')
      .attr('stroke', '#141b2d')
      .attr('stroke-width', 2);

    boxPlotsEnter.append('line')
      .attr('class', 'whisker-cap-high')
      .attr('stroke', '#141b2d')
      .attr('stroke-width', 2);

    // Box (Q1 to Q3)
    boxPlotsEnter.append('rect')
      .attr('class', 'box')
      .attr('fill', '#e5e7eb')
      .attr('stroke', '#141b2d')
      .attr('stroke-width', 2)
      .attr('width', this.boxWidth)
      .attr('x', -this.boxWidth / 2);

    // Median line
    boxPlotsEnter.append('line')
      .attr('class', 'median-line')
      .attr('stroke', '#141b2d')
      .attr('stroke-width', 3)
      .attr('x1', -this.boxWidth / 2)
      .attr('x2', this.boxWidth / 2);

    // Enter + Update
    const boxPlotsMerge = boxPlotsEnter.merge(boxPlots);

    boxPlotsMerge
      .transition()
      .duration(this.options.animationDuration)
      .attr('transform', d => {
        const x = this.xScale(d.strategy) + this.xScale.bandwidth() / 2;
        return `translate(${x},0)`;
      });

    // Update whiskers
    boxPlotsMerge.select('.whisker-low')
      .transition()
      .duration(this.options.animationDuration)
      .attr('y1', d => this.yScale(d.min))
      .attr('y2', d => this.yScale(d.q1))
      .attr('x1', 0)
      .attr('x2', 0);

    boxPlotsMerge.select('.whisker-high')
      .transition()
      .duration(this.options.animationDuration)
      .attr('y1', d => this.yScale(d.q3))
      .attr('y2', d => this.yScale(d.max))
      .attr('x1', 0)
      .attr('x2', 0);

    // Update whisker caps
    const capWidth = 6;
    boxPlotsMerge.select('.whisker-cap-low')
      .transition()
      .duration(this.options.animationDuration)
      .attr('y1', d => this.yScale(d.min))
      .attr('y2', d => this.yScale(d.min))
      .attr('x1', -capWidth)
      .attr('x2', capWidth);

    boxPlotsMerge.select('.whisker-cap-high')
      .transition()
      .duration(this.options.animationDuration)
      .attr('y1', d => this.yScale(d.max))
      .attr('y2', d => this.yScale(d.max))
      .attr('x1', -capWidth)
      .attr('x2', capWidth);

    // Update box
    boxPlotsMerge.select('.box')
      .transition()
      .duration(this.options.animationDuration)
      .attr('y', d => this.yScale(d.q3))
      .attr('height', d => this.yScale(d.q1) - this.yScale(d.q3));

    // Update median line
    boxPlotsMerge.select('.median-line')
      .transition()
      .duration(this.options.animationDuration)
      .attr('y1', d => this.yScale(d.median))
      .attr('y2', d => this.yScale(d.median));

    // Exit
    boxPlots.exit()
      .transition()
      .duration(this.options.animationDuration / 2)
      .attr('opacity', 0)
      .remove();
  }

  /**
   * Show tooltip on hover (Requirement 5.5)
   * @param {Event} event - Mouse event
   * @param {Object} data - Violin data
   * @private
   */
  _showTooltip(event, data) {
    this.tooltip
      .style('visibility', 'visible')
      .html(`
        <div style="color: #e5e7eb; font-weight: 600; margin-bottom: 6px; font-size: 13px;">
          ${data.strategy}
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Median: <span style="color: #e5e7eb; font-weight: 600;">${this._formatCurrency(data.median)}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Mean: <span style="color: #e5e7eb; font-weight: 600;">${this._formatCurrency(data.mean)}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Std Dev: <span style="color: #e5e7eb; font-weight: 600;">${this._formatCurrency(data.stdDev)}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Q1: <span style="color: #9ca3af; font-weight: 500;">${this._formatCurrency(data.q1)}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Q3: <span style="color: #9ca3af; font-weight: 500;">${this._formatCurrency(data.q3)}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px;">
          Range: <span style="color: #9ca3af; font-weight: 500;">${this._formatCurrency(data.min)} to ${this._formatCurrency(data.max)}</span>
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
    if (this.violinsGroup) this.violinsGroup.selectAll('*').remove();
    if (this.boxPlotsGroup) this.boxPlotsGroup.selectAll('*').remove();
    if (this.axesGroup) this.axesGroup.selectAll('*').remove();
    
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
        .text('No violin plot data available');
      
      this.chartGroup.append('text')
        .attr('class', 'empty-state-text')
        .attr('x', width / 2)
        .attr('y', height / 2 + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '12px')
        .text('Upload trades with close dates to see P/L distribution by strategy');
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
  module.exports = ViolinPlotChart;
}
