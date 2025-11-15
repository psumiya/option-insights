/**
 * Bubble Chart Component
 * Renders a bubble chart showing Win Rate vs Average Win with bubble size for trade count
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
class BubbleChart {
  /**
   * Create Bubble Chart
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Array} data - Array of {strategy, winRate, averageWin, tradeCount, netPL} objects
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
    this.margin = { top: 60, right: 40, bottom: 80, left: 100 };
    this.minBubbleRadius = 10;
    this.maxBubbleRadius = 60;
    this.options = {
      animationDuration: 750,
      ...options
    };

    // Initialize chart
    this._initChart();
    
    // Set up resize observer (Requirement 7.1)
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
      .attr('class', 'bubble-chart-svg');

    // Create main group for chart content
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Create groups for different chart elements
    this.axesGroup = this.chartGroup.append('g').attr('class', 'axes-group');
    this.referenceLinesGroup = this.chartGroup.append('g').attr('class', 'reference-lines-group');
    this.quadrantLabelsGroup = this.chartGroup.append('g').attr('class', 'quadrant-labels-group');
    this.bubblesGroup = this.chartGroup.append('g').attr('class', 'bubbles-group');

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

    // Initialize color scale for net P/L (Requirement 7.4)
    // Red (negative) → Yellow (neutral) → Green (positive)
    this.colorScale = d3.scaleSequential()
      .interpolator(d3.interpolateRdYlGn);
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
   * @param {Array} data - Array of strategy objects
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

    // Create scales (Requirement 7.1)
    this._createScales();

    // Render axes (Requirement 7.1)
    this._renderAxes();

    // Render reference lines and quadrant labels (Requirement 7.6)
    this._renderReferenceLines();
    this._renderQuadrantLabels();

    // Render bubbles (Requirement 7.2)
    this._renderBubbles();
  }

  /**
   * Process and validate data
   * @private
   */
  _processData() {
    // Filter out invalid data and ensure numeric values
    this.processedData = this.data.filter(d => 
      d.winRate != null && 
      d.averageWin != null && 
      d.tradeCount != null &&
      d.netPL != null &&
      !isNaN(d.winRate) && 
      !isNaN(d.averageWin) &&
      !isNaN(d.tradeCount) &&
      !isNaN(d.netPL)
    );
  }

  /**
   * Create X, Y, size, and color scales
   * @private
   */
  _createScales() {
    // X-axis: Win Rate (0-100%) (Requirement 7.1)
    this.xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, this.width])
      .nice();

    // Y-axis: Average Win ($) (Requirement 7.1)
    const avgWinExtent = d3.extent(this.processedData, d => d.averageWin);
    const avgWinPadding = (avgWinExtent[1] - avgWinExtent[0]) * 0.15 || 100;
    this.yScale = d3.scaleLinear()
      .domain([
        Math.min(avgWinExtent[0] - avgWinPadding, 0),
        avgWinExtent[1] + avgWinPadding
      ])
      .range([this.height, 0])
      .nice();

    // Bubble size scale: Trade count (Requirement 7.3)
    const tradeCountExtent = d3.extent(this.processedData, d => d.tradeCount);
    this.sizeScale = d3.scaleSqrt()
      .domain([0, tradeCountExtent[1]])
      .range([this.minBubbleRadius, this.maxBubbleRadius]);

    // Color scale: Net P/L (Requirement 7.4)
    const netPLExtent = d3.extent(this.processedData, d => d.netPL);
    const maxAbsNetPL = Math.max(Math.abs(netPLExtent[0]), Math.abs(netPLExtent[1]));
    this.colorScale.domain([-maxAbsNetPL, maxAbsNetPL]);
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
      .ticks(10)
      .tickFormat(d => d + '%');

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
      .attr('y', this.height + 50)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Win Rate (%)');

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
      .attr('y', -70)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Average Win ($)');
  }

  /**
   * Render reference lines at 50% win rate and $0 average win
   * @private
   */
  _renderReferenceLines() {
    // Clear existing reference lines
    this.referenceLinesGroup.selectAll('*').remove();

    // Vertical line at 50% win rate (Requirement 7.6)
    if (this.xScale.domain()[0] <= 50 && this.xScale.domain()[1] >= 50) {
      this.referenceLinesGroup.append('line')
        .attr('class', 'reference-line-vertical')
        .attr('x1', this.xScale(50))
        .attr('x2', this.xScale(50))
        .attr('y1', 0)
        .attr('y2', this.height)
        .attr('stroke', '#6b7280')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.5);
    }

    // Horizontal line at $0 average win (Requirement 7.6)
    if (this.yScale.domain()[0] <= 0 && this.yScale.domain()[1] >= 0) {
      this.referenceLinesGroup.append('line')
        .attr('class', 'reference-line-horizontal')
        .attr('x1', 0)
        .attr('x2', this.width)
        .attr('y1', this.yScale(0))
        .attr('y2', this.yScale(0))
        .attr('stroke', '#6b7280')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.5);
    }
  }

  /**
   * Render quadrant labels
   * @private
   */
  _renderQuadrantLabels() {
    // Clear existing labels
    this.quadrantLabelsGroup.selectAll('*').remove();

    const labelOffset = 15;
    const labelStyle = {
      fill: '#6b7280',
      fontSize: '11px',
      fontWeight: '500',
      opacity: 0.7
    };

    // Only render labels if reference lines are visible
    const has50PercentLine = this.xScale.domain()[0] <= 50 && this.xScale.domain()[1] >= 50;
    const hasZeroLine = this.yScale.domain()[0] <= 0 && this.yScale.domain()[1] >= 0;

    if (has50PercentLine && hasZeroLine) {
      // Top-right quadrant: High Quality (>50% win rate, positive avg win)
      this.quadrantLabelsGroup.append('text')
        .attr('x', this.xScale(50) + labelOffset)
        .attr('y', this.yScale(0) - labelOffset)
        .attr('text-anchor', 'start')
        .attr('fill', labelStyle.fill)
        .attr('font-size', labelStyle.fontSize)
        .attr('font-weight', labelStyle.fontWeight)
        .attr('opacity', labelStyle.opacity)
        .text('High Quality');

      // Top-left quadrant: Big Winners (<50% win rate, positive avg win)
      this.quadrantLabelsGroup.append('text')
        .attr('x', this.xScale(50) - labelOffset)
        .attr('y', this.yScale(0) - labelOffset)
        .attr('text-anchor', 'end')
        .attr('fill', labelStyle.fill)
        .attr('font-size', labelStyle.fontSize)
        .attr('font-weight', labelStyle.fontWeight)
        .attr('opacity', labelStyle.opacity)
        .text('Big Winners');

      // Bottom-right quadrant: Volume Play (>50% win rate, negative avg win)
      this.quadrantLabelsGroup.append('text')
        .attr('x', this.xScale(50) + labelOffset)
        .attr('y', this.yScale(0) + labelOffset + 10)
        .attr('text-anchor', 'start')
        .attr('fill', labelStyle.fill)
        .attr('font-size', labelStyle.fontSize)
        .attr('font-weight', labelStyle.fontWeight)
        .attr('opacity', labelStyle.opacity)
        .text('Volume Play');

      // Bottom-left quadrant: Needs Work (<50% win rate, negative avg win)
      this.quadrantLabelsGroup.append('text')
        .attr('x', this.xScale(50) - labelOffset)
        .attr('y', this.yScale(0) + labelOffset + 10)
        .attr('text-anchor', 'end')
        .attr('fill', labelStyle.fill)
        .attr('font-size', labelStyle.fontSize)
        .attr('font-weight', labelStyle.fontWeight)
        .attr('opacity', labelStyle.opacity)
        .text('Needs Work');
    }
  }

  /**
   * Render bubbles for each strategy
   * @private
   */
  _renderBubbles() {
    // Bind data (Requirement 7.2)
    const bubbles = this.bubblesGroup
      .selectAll('.bubble')
      .data(this.processedData, d => d.strategy);

    // Enter
    const bubblesEnter = bubbles.enter()
      .append('circle')
      .attr('class', 'bubble')
      .attr('r', 0)
      .attr('cx', d => this.xScale(d.winRate))
      .attr('cy', d => this.yScale(d.averageWin))
      .attr('stroke', '#141b2d')
      .attr('stroke-width', 2)
      .attr('opacity', 0.75)
      .style('cursor', 'pointer');

    // Enter + Update
    bubblesEnter.merge(bubbles)
      .on('mouseover', (event, d) => this._showTooltip(event, d))
      .on('mouseout', () => this._hideTooltip())
      .transition()
      .duration(this.options.animationDuration)
      .attr('cx', d => this.xScale(d.winRate))
      .attr('cy', d => this.yScale(d.averageWin))
      .attr('r', d => this.sizeScale(d.tradeCount)) // Requirement 7.3
      .attr('fill', d => this.colorScale(d.netPL)); // Requirement 7.4

    // Exit
    bubbles.exit()
      .transition()
      .duration(this.options.animationDuration / 2)
      .attr('r', 0)
      .attr('opacity', 0)
      .remove();

    // Add strategy labels on bubbles
    const labels = this.bubblesGroup
      .selectAll('.bubble-label')
      .data(this.processedData, d => d.strategy);

    const labelsEnter = labels.enter()
      .append('text')
      .attr('class', 'bubble-label')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.8)');

    labelsEnter.merge(labels)
      .transition()
      .duration(this.options.animationDuration)
      .attr('x', d => this.xScale(d.winRate))
      .attr('y', d => this.yScale(d.averageWin))
      .attr('opacity', d => {
        const radius = this.sizeScale(d.tradeCount);
        // Calculate if text fits with padding
        const textWidth = d.strategy.length * 6.5; // Approximate character width
        const availableWidth = radius * 2 * 0.85; // Use 85% of diameter for padding
        return radius > 20 && textWidth < availableWidth ? 1 : 0;
      })
      .text(d => {
        const radius = this.sizeScale(d.tradeCount);
        const maxChars = Math.floor((radius * 2 * 0.85) / 6.5);
        // Truncate text if too long
        return d.strategy.length > maxChars ? d.strategy.substring(0, maxChars - 1) + '…' : d.strategy;
      });

    labels.exit()
      .transition()
      .duration(this.options.animationDuration / 2)
      .attr('opacity', 0)
      .remove();
  }

  /**
   * Show tooltip on hover (Requirement 7.5)
   * @param {Event} event - Mouse event
   * @param {Object} data - Bubble data
   * @private
   */
  _showTooltip(event, data) {
    const netPLColor = data.netPL >= 0 ? '#10b981' : '#ef4444';

    this.tooltip
      .style('visibility', 'visible')
      .html(`
        <div style="color: #e5e7eb; font-weight: 600; margin-bottom: 6px; font-size: 13px;">
          ${data.strategy}
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Win Rate: <span style="color: #e5e7eb; font-weight: 600;">${data.winRate.toFixed(1)}%</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Avg Win: <span style="color: #10b981; font-weight: 600;">${this._formatCurrency(data.averageWin)}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Trade Count: <span style="color: #e5e7eb; font-weight: 600;">${data.tradeCount}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px;">
          Net P/L: <span style="color: ${netPLColor}; font-weight: 600;">${this._formatCurrency(data.netPL)}</span>
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
    if (this.bubblesGroup) this.bubblesGroup.selectAll('*').remove();
    if (this.axesGroup) this.axesGroup.selectAll('*').remove();
    if (this.referenceLinesGroup) this.referenceLinesGroup.selectAll('*').remove();
    if (this.quadrantLabelsGroup) this.quadrantLabelsGroup.selectAll('*').remove();
    
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
        .text('No bubble chart data available');
      
      this.chartGroup.append('text')
        .attr('class', 'empty-state-text')
        .attr('x', width / 2)
        .attr('y', height / 2 + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '12px')
        .text('Upload trades with close dates to see win rate analysis');
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
  module.exports = BubbleChart;
}
