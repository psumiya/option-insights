/**
 * Horizon Chart Component
 * Renders a compressed time-series visualization showing cumulative P/L over time
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
class HorizonChart {
  /**
   * Create Horizon Chart
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Array} data - Array of {date, cumulativePL} objects
   * @param {Object} options - Chart configuration options
   */
  constructor(containerId, data = [], options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    
    if (!this.container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }

    // Chart configuration (Requirement 10.1, 10.2)
    this.margin = { top: 20, right: 40, bottom: 30, left: 80 };
    this.chartHeight = 350; // Compressed height - increased for better visibility
    this.numBands = 4; // Number of color bands for magnitude ranges
    this.options = {
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
      .attr('class', 'horizon-chart-svg');

    // Create main group for chart content
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Create groups for different chart elements
    this.layersGroup = this.chartGroup.append('g').attr('class', 'layers-group');
    this.axisGroup = this.chartGroup.append('g').attr('class', 'axis-group');
    this.baselineGroup = this.chartGroup.append('g').attr('class', 'baseline-group');

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

    // Initialize scales (Requirement 10.1, 10.2)
    this.xScale = d3.scaleTime();
    this.yScale = d3.scaleLinear();
    
    // Initialize color scales for positive and negative bands (Requirement 10.2, 10.3)
    // Positive: Light green → Dark green
    this.positiveColors = ['#86efac', '#4ade80', '#22c55e', '#16a34a'];
    // Negative: Light red → Dark red
    this.negativeColors = ['#fca5a5', '#f87171', '#ef4444', '#dc2626'];
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
   * @param {Array} data - Array of cumulative P/L objects
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
    this.height = this.chartHeight;

    // Process data
    this._processData();

    // Update scales
    this._updateScales();

    // Render horizon layers (Requirement 10.2, 10.3, 10.4)
    this._renderLayers();

    // Render axes
    this._renderAxes();

    // Render baseline
    this._renderBaseline();
  }

  /**
   * Process data and convert dates
   * @private
   */
  _processData() {
    // Convert dates to Date objects and sort (Requirement 10.6)
    this.processedData = this.data.map(d => ({
      date: d.date instanceof Date ? d.date : new Date(d.date),
      cumulativePL: d.cumulativePL
    })).sort((a, b) => a.date - b.date);
  }

  /**
   * Update scales based on data
   * @private
   */
  _updateScales() {
    // X scale: time scale for dates
    this.xScale
      .domain(d3.extent(this.processedData, d => d.date))
      .range([0, this.width]);

    // Y scale: Calculate max absolute value for symmetric bands
    const plValues = this.processedData.map(d => d.cumulativePL);
    const maxAbsPL = Math.max(Math.abs(d3.min(plValues)), Math.abs(d3.max(plValues)));
    
    // Each band represents a range of values
    this.bandHeight = this.height / this.numBands;
    this.maxValue = maxAbsPL;
    this.bandThreshold = maxAbsPL / this.numBands;

    // Y scale maps P/L to height within a single band
    this.yScale
      .domain([0, this.bandThreshold])
      .range([0, this.bandHeight]);
  }

  /**
   * Render horizon layers with clipping paths
   * @private
   */
  _renderLayers() {
    // Clear existing layers
    this.layersGroup.selectAll('*').remove();

    // Create area generator
    const area = d3.area()
      .x(d => this.xScale(d.date))
      .y0(this.height / 2)
      .y1(d => {
        const value = Math.abs(d.cumulativePL);
        const bandIndex = Math.min(Math.floor(value / this.bandThreshold), this.numBands - 1);
        const valueInBand = value % this.bandThreshold;
        return this.height / 2 - this.yScale(valueInBand);
      })
      .curve(d3.curveMonotoneX);

    // Render positive bands (above baseline) (Requirement 10.4)
    for (let i = 0; i < this.numBands; i++) {
      const bandData = this.processedData.filter(d => {
        const value = d.cumulativePL;
        if (value <= 0) return false;
        const bandIndex = Math.min(Math.floor(value / this.bandThreshold), this.numBands - 1);
        return bandIndex >= i;
      }).map(d => {
        const value = d.cumulativePL;
        const bandIndex = Math.min(Math.floor(value / this.bandThreshold), this.numBands - 1);
        const valueInBand = value % this.bandThreshold;
        
        return {
          date: d.date,
          cumulativePL: d.cumulativePL,
          displayValue: bandIndex === i ? valueInBand : this.bandThreshold
        };
      });

      if (bandData.length > 0) {
        // Create clipping path for this band
        const clipId = `clip-positive-${i}`;
        const defs = this.svg.select('defs').empty() 
          ? this.svg.append('defs') 
          : this.svg.select('defs');

        defs.selectAll(`#${clipId}`).remove();
        const clipPath = defs.append('clipPath')
          .attr('id', clipId);

        clipPath.append('rect')
          .attr('x', 0)
          .attr('y', this.height / 2 - (i + 1) * this.bandHeight)
          .attr('width', this.width)
          .attr('height', this.bandHeight);

        // Create area for this band
        const areaGenerator = d3.area()
          .x(d => this.xScale(d.date))
          .y0(this.height / 2 - i * this.bandHeight)
          .y1(d => this.height / 2 - i * this.bandHeight - this.yScale(d.displayValue))
          .curve(d3.curveMonotoneX);

        this.layersGroup.append('path')
          .datum(bandData)
          .attr('class', `horizon-layer positive-${i}`)
          .attr('d', areaGenerator)
          .attr('fill', this.positiveColors[i])
          .attr('clip-path', `url(#${clipId})`)
          .attr('opacity', 0)
          .transition()
          .duration(this.options.animationDuration)
          .attr('opacity', 0.8);
      }
    }

    // Render negative bands (below baseline) (Requirement 10.4)
    for (let i = 0; i < this.numBands; i++) {
      const bandData = this.processedData.filter(d => {
        const value = Math.abs(d.cumulativePL);
        if (d.cumulativePL >= 0) return false;
        const bandIndex = Math.min(Math.floor(value / this.bandThreshold), this.numBands - 1);
        return bandIndex >= i;
      }).map(d => {
        const value = Math.abs(d.cumulativePL);
        const bandIndex = Math.min(Math.floor(value / this.bandThreshold), this.numBands - 1);
        const valueInBand = value % this.bandThreshold;
        
        return {
          date: d.date,
          cumulativePL: d.cumulativePL,
          displayValue: bandIndex === i ? valueInBand : this.bandThreshold
        };
      });

      if (bandData.length > 0) {
        // Create clipping path for this band
        const clipId = `clip-negative-${i}`;
        const defs = this.svg.select('defs').empty() 
          ? this.svg.append('defs') 
          : this.svg.select('defs');

        defs.selectAll(`#${clipId}`).remove();
        const clipPath = defs.append('clipPath')
          .attr('id', clipId);

        clipPath.append('rect')
          .attr('x', 0)
          .attr('y', this.height / 2 + i * this.bandHeight)
          .attr('width', this.width)
          .attr('height', this.bandHeight);

        // Create area for this band
        const areaGenerator = d3.area()
          .x(d => this.xScale(d.date))
          .y0(this.height / 2 + i * this.bandHeight)
          .y1(d => this.height / 2 + i * this.bandHeight + this.yScale(d.displayValue))
          .curve(d3.curveMonotoneX);

        this.layersGroup.append('path')
          .datum(bandData)
          .attr('class', `horizon-layer negative-${i}`)
          .attr('d', areaGenerator)
          .attr('fill', this.negativeColors[i])
          .attr('clip-path', `url(#${clipId})`)
          .attr('opacity', 0)
          .transition()
          .duration(this.options.animationDuration)
          .attr('opacity', 0.8);
      }
    }

    // Add invisible overlay for hover interactions
    this.layersGroup.append('rect')
      .attr('class', 'hover-overlay')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => this._handleMouseMove(event))
      .on('mouseout', () => this._hideTooltip());
  }

  /**
   * Render axes
   * @private
   */
  _renderAxes() {
    // Clear existing axes
    this.axisGroup.selectAll('*').remove();

    // X-axis at bottom
    const xAxis = d3.axisBottom(this.xScale)
      .ticks(6)
      .tickFormat(d3.timeFormat('%b %Y'));

    this.axisGroup.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${this.height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#9ca3af')
      .attr('font-size', '11px');

    this.axisGroup.selectAll('.x-axis path, .x-axis line')
      .attr('stroke', '#374151');

    // Y-axis labels (show band ranges)
    const yAxisGroup = this.axisGroup.append('g')
      .attr('class', 'y-axis');

    // Positive side labels
    for (let i = 0; i < this.numBands; i++) {
      const value = (i + 1) * this.bandThreshold;
      const y = this.height / 2 - (i + 1) * this.bandHeight;
      
      yAxisGroup.append('text')
        .attr('x', -10)
        .attr('y', y)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '10px')
        .text(this._formatCurrency(value));
    }

    // Negative side labels
    for (let i = 0; i < this.numBands; i++) {
      const value = -(i + 1) * this.bandThreshold;
      const y = this.height / 2 + (i + 1) * this.bandHeight;
      
      yAxisGroup.append('text')
        .attr('x', -10)
        .attr('y', y)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '10px')
        .text(this._formatCurrency(value));
    }
  }

  /**
   * Render baseline at center
   * @private
   */
  _renderBaseline() {
    // Clear existing baseline
    this.baselineGroup.selectAll('*').remove();

    // Draw baseline at Y=0
    this.baselineGroup.append('line')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', this.height / 2)
      .attr('y2', this.height / 2)
      .attr('stroke', '#6b7280')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');

    // Add baseline label
    this.baselineGroup.append('text')
      .attr('x', this.width + 10)
      .attr('y', this.height / 2)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', '10px')
      .text('$0');
  }

  /**
   * Handle mouse move for tooltip (Requirement 10.5)
   * @param {Event} event - Mouse event
   * @private
   */
  _handleMouseMove(event) {
    const [mouseX] = d3.pointer(event);
    const date = this.xScale.invert(mouseX);

    // Find closest data point
    const bisect = d3.bisector(d => d.date).left;
    const index = bisect(this.processedData, date);
    
    let closestData;
    if (index === 0) {
      closestData = this.processedData[0];
    } else if (index === this.processedData.length) {
      closestData = this.processedData[this.processedData.length - 1];
    } else {
      const d0 = this.processedData[index - 1];
      const d1 = this.processedData[index];
      closestData = date - d0.date > d1.date - date ? d1 : d0;
    }

    if (closestData) {
      this._showTooltip(event, closestData);
    }
  }

  /**
   * Show tooltip on hover (Requirement 10.5)
   * @param {Event} event - Mouse event
   * @param {Object} data - Data point
   * @private
   */
  _showTooltip(event, data) {
    const plColor = data.cumulativePL >= 0 ? '#10b981' : '#ef4444';
    const dateStr = d3.timeFormat('%b %d, %Y')(data.date);

    this.tooltip
      .style('visibility', 'visible')
      .html(`
        <div style="color: #e5e7eb; font-weight: 600; margin-bottom: 4px;">
          ${dateStr}
        </div>
        <div style="color: #9ca3af; font-size: 11px;">
          Cumulative P/L: <span style="color: ${plColor}; font-weight: 600;">${this._formatCurrency(data.cumulativePL)}</span>
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
    if (this.layersGroup) this.layersGroup.selectAll('*').remove();
    if (this.axisGroup) this.axisGroup.selectAll('*').remove();
    if (this.baselineGroup) this.baselineGroup.selectAll('*').remove();
    
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
        .text('No horizon chart data available');
      
      this.chartGroup.append('text')
        .attr('class', 'empty-state-text')
        .attr('x', width / 2)
        .attr('y', height / 2 + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '12px')
        .text('Upload trades with close dates to see long-term P/L trends');
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
  module.exports = HorizonChart;
}
