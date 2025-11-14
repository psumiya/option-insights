/**
 * Win/Loss Distribution Donut Chart Component
 * Renders a donut chart showing the distribution of winning vs losing trades
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.8
 */
class WinLossDonutChart {
  /**
   * Create Win/Loss Donut Chart
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Object} data - Object with {wins, losses, winPercentage, lossPercentage}
   * @param {Object} options - Chart configuration options
   */
  constructor(containerId, data = null, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    
    if (!this.container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }

    // Chart configuration
    this.options = {
      animationDuration: 750,
      colors: {
        wins: '#10b981',    // Green for wins (Requirement 14.4)
        losses: '#ef4444'   // Red for losses (Requirement 14.4)
      },
      ...options
    };

    // Initialize chart
    this._initChart();
    
    // Set up resize observer
    this._setupResizeObserver();
    
    // Render initial data
    if (data) {
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
      .attr('class', 'donut-chart-svg');

    // Create main group for chart content (will be centered)
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-content');

    // Create groups for different chart elements
    this.arcsGroup = this.chartGroup.append('g').attr('class', 'arcs-group');
    this.labelsGroup = this.chartGroup.append('g').attr('class', 'labels-group');
    this.centerTextGroup = this.chartGroup.append('g').attr('class', 'center-text-group');

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

    // Initialize arc generator (Requirement 14.4)
    this.arcGenerator = d3.arc();
    
    // Initialize pie generator
    this.pieGenerator = d3.pie()
      .value(d => d.count)
      .sort(null); // Maintain order: wins first, then losses
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
   * @param {Object} data - Win/loss distribution data
   */
  update(data) {
    if (!data || (data.wins === 0 && data.losses === 0)) {
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
    const width = containerRect.width;
    const height = containerRect.height;

    // Calculate radius (leave some padding)
    const radius = Math.min(width, height) / 2 - 20;
    const innerRadius = radius * 0.6; // 60% for donut effect (Requirement 14.4)

    // Center the chart group
    this.chartGroup.attr('transform', `translate(${width / 2},${height / 2})`);

    // Update arc generator with new dimensions
    this.arcGenerator
      .innerRadius(innerRadius)
      .outerRadius(radius);

    // Prepare data for pie chart (Requirement 14.2, 14.3)
    const pieData = [
      { label: 'Wins', count: this.data.wins, percentage: this.data.winPercentage, color: this.options.colors.wins },
      { label: 'Losses', count: this.data.losses, percentage: this.data.lossPercentage, color: this.options.colors.losses }
    ];

    // Render arcs
    this._renderArcs(pieData);

    // Render percentage labels (Requirement 14.5)
    this._renderLabels(pieData);

    // Render center text (Requirement 14.6)
    this._renderCenterText();
  }

  /**
   * Render donut arcs
   * @param {Array} pieData - Prepared pie data
   * @private
   */
  _renderArcs(pieData) {
    // Bind data
    const arcs = this.arcsGroup
      .selectAll('.arc')
      .data(this.pieGenerator(pieData));

    // Enter
    const arcsEnter = arcs.enter()
      .append('path')
      .attr('class', 'arc')
      .attr('fill', d => d.data.color)
      .attr('stroke', '#141b2d')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => this._showTooltip(event, d))
      .on('mouseout', () => this._hideTooltip());

    // Enter + Update with transition
    arcsEnter.merge(arcs)
      .transition()
      .duration(this.options.animationDuration)
      .attrTween('d', function(d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t) {
          return this.arcGenerator(interpolate(t));
        }.bind(this);
      }.bind(this));

    // Exit
    arcs.exit()
      .transition()
      .duration(this.options.animationDuration / 2)
      .attrTween('d', function(d) {
        const interpolate = d3.interpolate(d, { startAngle: 0, endAngle: 0 });
        return function(t) {
          return this.arcGenerator(interpolate(t));
        }.bind(this);
      }.bind(this))
      .remove();
  }

  /**
   * Render percentage labels on or adjacent to segments
   * @param {Array} pieData - Prepared pie data
   * @private
   */
  _renderLabels(pieData) {
    // Bind data
    const labels = this.labelsGroup
      .selectAll('.percentage-label')
      .data(this.pieGenerator(pieData));

    // Enter
    const labelsEnter = labels.enter()
      .append('text')
      .attr('class', 'percentage-label')
      .attr('text-anchor', 'middle')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '16px')
      .attr('font-weight', '600')
      .attr('opacity', 0);

    // Enter + Update
    labelsEnter.merge(labels)
      .transition()
      .duration(this.options.animationDuration)
      .attr('transform', d => {
        // Position label at the centroid of the arc
        const [x, y] = this.arcGenerator.centroid(d);
        return `translate(${x},${y})`;
      })
      .attr('opacity', 1)
      .text(d => `${d.data.percentage.toFixed(1)}%`);

    // Exit
    labels.exit()
      .transition()
      .duration(this.options.animationDuration / 2)
      .attr('opacity', 0)
      .remove();
  }

  /**
   * Render center text showing total trades count
   * @private
   */
  _renderCenterText() {
    const totalTrades = this.data.wins + this.data.losses;

    // Remove existing center text
    this.centerTextGroup.selectAll('*').remove();

    // Add total trades count
    this.centerTextGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('fill', '#e5e7eb')
      .attr('font-size', '28px')
      .attr('font-weight', '700')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(totalTrades);

    // Add label
    this.centerTextGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.5em')
      .attr('fill', '#9ca3af')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .text('Total Trades');
  }

  /**
   * Show tooltip on hover (Requirement 14.6)
   * @param {Event} event - Mouse event
   * @param {Object} d - Pie data
   * @private
   */
  _showTooltip(event, d) {
    this.tooltip
      .style('visibility', 'visible')
      .html(`
        <div style="color: #e5e7eb; font-weight: 600; margin-bottom: 4px;">
          ${d.data.label}
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-bottom: 2px;">
          Count: <span style="color: ${d.data.color}; font-weight: 600;">${d.data.count}</span>
        </div>
        <div style="color: #9ca3af; font-size: 11px;">
          Percentage: <span style="color: ${d.data.color}; font-weight: 600;">${d.data.percentage.toFixed(1)}%</span>
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
    if (this.arcsGroup) this.arcsGroup.selectAll('*').remove();
    if (this.labelsGroup) this.labelsGroup.selectAll('*').remove();
    if (this.centerTextGroup) this.centerTextGroup.selectAll('*').remove();
    
    // Add empty state message
    if (this.chartGroup) {
      this.chartGroup.selectAll('.empty-state-text').remove();
      
      this.chartGroup.append('text')
        .attr('class', 'empty-state-text')
        .attr('x', 0)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '16px')
        .text('No win/loss data available');
      
      this.chartGroup.append('text')
        .attr('class', 'empty-state-text')
        .attr('x', 0)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af')
        .attr('font-size', '12px')
        .text('Upload trades to see distribution');
    }
  }

  /**
   * Resize chart to fit container
   */
  resize() {
    if (this.data) {
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
  module.exports = WinLossDonutChart;
}
