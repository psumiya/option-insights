/**
 * Sankey Diagram Chart Component
 * Renders a Sankey diagram showing trade flow from symbols through strategies to outcomes
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
class SankeyDiagramChart {
  /**
   * Create Sankey Diagram Chart
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Array} data - Array of {nodes, links} objects
   * @param {Object} options - Chart configuration options
   */
  constructor(containerId, data = [], options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    
    if (!this.container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }

    // Chart configuration - responsive margins
    const isMobile = window.innerWidth < 768;
    this.margin = isMobile 
      ? { top: 40, right: 20, bottom: 40, left: 20 }
      : { top: 60, right: 80, bottom: 60, left: 80 };
    this.options = {
      animationDuration: 750,
      maxSymbols: 10, // Requirement 6.6
      nodeWidth: isMobile ? 20 : 30,
      nodePadding: isMobile ? 15 : 30,
      minLinkWidth: isMobile ? 2 : 3,
      resultNodeWidth: isMobile ? 35 : 50, // Special width for Win/Loss nodes
      ...options
    };

    // Initialize chart
    this._initChart();
    
    // Set up resize observer (Requirement 6.1)
    this._setupResizeObserver();
    
    // Register for theme changes
    if (typeof ThemeColors !== 'undefined') {
      ThemeColors.registerChart(this);
    }
    
    // Render initial data
    if (data && data.nodes && data.nodes.length > 0) {
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
      .attr('class', 'sankey-diagram-svg');

    // Create main group for chart content
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Create groups for different chart elements
    this.linksGroup = this.chartGroup.append('g').attr('class', 'links-group');
    this.nodesGroup = this.chartGroup.append('g').attr('class', 'nodes-group');

    // Create tooltip (theme-aware via CSS)
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('border-radius', '4px')
      .style('padding', '8px 12px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');
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
   * @param {Object} data - Object with nodes and links arrays
   * @param {Object} options - Update options
   */
  update(data, options = {}) {
    if (!data || !data.nodes || data.nodes.length === 0) {
      this._showEmptyState();
      return;
    }

    // Store data for theme changes
    this.currentData = data;
    this.data = data;

    // Render chart
    this._render();
  }

  /**
   * Render the Sankey diagram
   * @private
   */
  _render() {
    // Get theme colors
    const colors = ThemeColors.get();
    this.colors = colors;

    // Get container dimensions
    const containerRect = this.container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    // Detect mobile and update margins/options
    const isMobile = width < 768;
    if (isMobile) {
      this.margin = { top: 40, right: 20, bottom: 40, left: 20 };
      this.options.nodeWidth = 20;
      this.options.nodePadding = 15;
      this.options.minLinkWidth = 2;
      this.options.resultNodeWidth = 35;
    } else {
      this.margin = { top: 60, right: 80, bottom: 60, left: 80 };
      this.options.nodeWidth = 30;
      this.options.nodePadding = 30;
      this.options.minLinkWidth = 3;
      this.options.resultNodeWidth = 50;
    }

    // Calculate chart dimensions
    const chartWidth = Math.max(width - this.margin.left - this.margin.right, 200);
    const chartHeight = Math.max(height - this.margin.top - this.margin.bottom, 200);

    // Update chart group transform
    this.chartGroup.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Update SVG size
    this.svg
      .attr('width', width)
      .attr('height', height);

    // Create Sankey layout (Requirement 6.2)
    const sankey = d3.sankey()
      .nodeId(d => d.id)
      .nodeWidth(this.options.nodeWidth)
      .nodePadding(this.options.nodePadding)
      .extent([[0, 0], [chartWidth, chartHeight]]);

    // Process data through Sankey layout
    const { nodes, links } = sankey({
      nodes: this.data.nodes.map(d => ({ ...d })),
      links: this.data.links.map(d => ({ ...d }))
    });

    // Render links (flows) (Requirement 6.3)
    this._renderLinks(links);

    // Render nodes (Requirement 6.1)
    this._renderNodes(nodes, isMobile);
  }

  /**
   * Render Sankey flow links
   * @private
   */
  _renderLinks(links) {
    // Clear existing links
    this.linksGroup.selectAll('*').remove();

    // Create link path generator
    const linkGenerator = d3.sankeyLinkHorizontal();

    // Bind data
    const linkElements = this.linksGroup
      .selectAll('.sankey-link')
      .data(links);

    // Enter
    const linksEnter = linkElements.enter()
      .append('path')
      .attr('class', 'sankey-link')
      .attr('d', linkGenerator)
      .attr('stroke-width', d => Math.max(this.options.minLinkWidth, d.width))
      .attr('stroke', d => {
        // Requirement 6.4: Color flows by result (green for Win, red for Loss)
        if (d.result === 'Win') {
          return this.colors.profit;
        } else if (d.result === 'Loss') {
          return this.colors.loss;
        }
        return this.colors.textSecondary; // Default gray for other cases
      })
      .attr('fill', 'none')
      .attr('opacity', 0)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => this._showLinkTooltip(event, d))
      .on('mousemove', (event) => this._moveTooltip(event))
      .on('mouseout', () => this._hideTooltip());

    // Animate entrance
    linksEnter
      .transition()
      .duration(this.options.animationDuration)
      .attr('opacity', 0.5);

    // Add hover effect
    linksEnter
      .on('mouseenter', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.5);
      });
  }

  /**
   * Render Sankey nodes
   * @private
   */
  _renderNodes(nodes, isMobile = false) {
    // Clear existing nodes
    this.nodesGroup.selectAll('*').remove();

    // Bind data
    const nodeElements = this.nodesGroup
      .selectAll('.sankey-node')
      .data(nodes);

    // Enter - create node groups
    const nodesEnter = nodeElements.enter()
      .append('g')
      .attr('class', 'sankey-node');

    // Add rectangles for nodes
    nodesEnter.append('rect')
      .attr('x', d => {
        // For Win/Loss nodes (layer 2), adjust x position to accommodate larger width
        if (d.layer === 2) {
          const extraWidth = (this.options.resultNodeWidth - (d.x1 - d.x0)) / 2;
          return d.x0 - extraWidth;
        }
        return d.x0;
      })
      .attr('y', d => d.y0)
      .attr('width', d => {
        // Use larger width for Win/Loss nodes
        if (d.layer === 2) {
          return this.options.resultNodeWidth;
        }
        return d.x1 - d.x0;
      })
      .attr('height', 0)
      .attr('fill', d => {
        // Color nodes by layer
        if (d.layer === 0) return this.colors.accent; // Symbol - blue
        if (d.layer === 1) return '#8b5cf6'; // Strategy - purple (consistent across themes)
        if (d.layer === 2) {
          // Result - green or red
          return d.name === 'Win' ? this.colors.profit : this.colors.loss;
        }
        return this.colors.textSecondary;
      })
      .attr('stroke', this.colors.surface)
      .attr('stroke-width', 3)
      .attr('opacity', 0.9)
      .attr('rx', d => d.layer === 2 ? 6 : 2) // Rounded corners for Win/Loss
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => this._showNodeTooltip(event, d))
      .on('mousemove', (event) => this._moveTooltip(event))
      .on('mouseout', () => this._hideTooltip())
      .transition()
      .duration(this.options.animationDuration)
      .attr('height', d => d.y1 - d.y0);

    // Add labels for nodes
    nodesEnter.append('text')
      .attr('x', d => {
        // Position text based on layer
        if (d.layer === 0) {
          // Symbol - left side, text to the left
          return d.x0 - (isMobile ? 5 : 10);
        } else if (d.layer === 2) {
          // Result - right side, text to the right (account for larger node)
          const extraWidth = (this.options.resultNodeWidth - (d.x1 - d.x0)) / 2;
          return d.x1 + extraWidth + (isMobile ? 5 : 10);
        } else {
          // Strategy - middle, text centered
          return (d.x0 + d.x1) / 2;
        }
      })
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => {
        if (d.layer === 0) return 'end';
        if (d.layer === 2) return 'start';
        return 'middle';
      })
      .attr('fill', this.colors.textPrimary)
      .attr('font-size', d => {
        // Scale font size based on layer and node height
        const nodeHeight = d.y1 - d.y0;
        const mobileFactor = isMobile ? 0.8 : 1;
        if (d.layer === 2) {
          // Win/Loss nodes - larger font
          return Math.min(Math.max(nodeHeight * 0.3 * mobileFactor, isMobile ? 14 : 18), isMobile ? 20 : 24) + 'px';
        } else if (d.layer === 1) {
          // Strategy nodes - medium font
          return Math.min(Math.max(nodeHeight * 0.25 * mobileFactor, isMobile ? 10 : 14), isMobile ? 14 : 18) + 'px';
        } else {
          // Symbol nodes - standard font
          return Math.min(Math.max(nodeHeight * 0.2 * mobileFactor, isMobile ? 9 : 13), isMobile ? 12 : 16) + 'px';
        }
      })
      .attr('font-weight', d => d.layer === 2 ? '700' : '600')
      .attr('opacity', 0)
      .text(d => d.name)
      .transition()
      .duration(this.options.animationDuration)
      .delay(this.options.animationDuration / 2)
      .attr('opacity', 1);

    // Add column headers
    this._renderColumnHeaders(isMobile);
  }

  /**
   * Render column headers for the three layers
   * @private
   */
  _renderColumnHeaders(isMobile = false) {
    const containerRect = this.container.getBoundingClientRect();
    const chartWidth = containerRect.width - this.margin.left - this.margin.right;

    const headers = [
      { label: 'Symbol', x: 0 },
      { label: 'Strategy', x: chartWidth / 2 },
      { label: 'Result', x: chartWidth }
    ];

    // Remove existing headers
    this.chartGroup.selectAll('.column-header').remove();

    const headerGroup = this.chartGroup
      .selectAll('.column-header')
      .data(headers);

    headerGroup.enter()
      .append('text')
      .attr('class', 'column-header')
      .attr('x', d => d.x)
      .attr('y', isMobile ? -15 : -25)
      .attr('text-anchor', d => {
        if (d.label === 'Symbol') return 'start';
        if (d.label === 'Result') return 'end';
        return 'middle';
      })
      .attr('fill', this.colors.textPrimary)
      .attr('font-size', isMobile ? '12px' : '18px')
      .attr('font-weight', '700')
      .attr('text-transform', 'uppercase')
      .attr('letter-spacing', '0.1em')
      .text(d => d.label);
  }

  /**
   * Show tooltip for link (flow)
   * @private
   */
  _showLinkTooltip(event, d) {
    // Requirement 6.5: Display Symbol, Strategy, Result, trade count, and total P/L
    const formatCurrency = d3.format('$,.2f');
    const colors = this.colors;
    
    const content = `
      <div style="font-weight: 600; margin-bottom: 6px; color: ${colors.textPrimary};">
        ${d.source.name} → ${d.target.name}
      </div>
      <div style="color: ${colors.textSecondary}; font-size: 11px; margin-bottom: 2px;">
        Result: <span style="color: ${d.result === 'Win' ? colors.profit : colors.loss}; font-weight: 600;">
          ${d.result || 'N/A'}
        </span>
      </div>
      <div style="color: ${colors.textSecondary}; font-size: 11px; margin-bottom: 2px;">
        Trade Count: <span style="color: ${colors.textPrimary}; font-weight: 600;">
          ${d.tradeCount || 0}
        </span>
      </div>
      <div style="color: ${colors.textSecondary}; font-size: 11px;">
        Total P/L: <span style="color: ${d.value >= 0 ? colors.profit : colors.loss}; font-weight: 600;">
          ${formatCurrency(Math.abs(d.value))}
        </span>
      </div>
    `;

    this.tooltip
      .html(content)
      .style('visibility', 'visible');

    this._moveTooltip(event);
  }

  /**
   * Show tooltip for node
   * @private
   */
  _showNodeTooltip(event, d) {
    const formatCurrency = d3.format('$,.2f');
    const colors = this.colors;
    
    // Calculate total value flowing through this node
    const totalValue = d.value || 0;
    const tradeCount = d.sourceLinks.reduce((sum, link) => sum + (link.tradeCount || 0), 0) ||
                       d.targetLinks.reduce((sum, link) => sum + (link.tradeCount || 0), 0);
    
    let content = `
      <div style="font-weight: 600; margin-bottom: 6px; color: ${colors.textPrimary};">
        ${d.name}
      </div>
    `;
    
    // Add layer-specific information
    if (d.layer === 0) {
      content += `<div style="color: ${colors.textSecondary}; font-size: 11px; margin-bottom: 2px;">Symbol</div>`;
    } else if (d.layer === 1) {
      content += `<div style="color: ${colors.textSecondary}; font-size: 11px; margin-bottom: 2px;">Strategy</div>`;
    } else if (d.layer === 2) {
      content += `<div style="color: ${colors.textSecondary}; font-size: 11px; margin-bottom: 2px;">Result</div>`;
    }
    
    content += `
      <div style="color: ${colors.textSecondary}; font-size: 11px; margin-bottom: 2px;">
        Trade Count: <span style="color: ${colors.textPrimary}; font-weight: 600;">
          ${tradeCount}
        </span>
      </div>
      <div style="color: ${colors.textSecondary}; font-size: 11px;">
        Total Value: <span style="color: ${totalValue >= 0 ? colors.profit : colors.loss}; font-weight: 600;">
          ${formatCurrency(Math.abs(totalValue))}
        </span>
      </div>
    `;

    this.tooltip
      .html(content)
      .style('visibility', 'visible');

    this._moveTooltip(event);
  }

  /**
   * Move tooltip to follow cursor
   * @private
   */
  _moveTooltip(event) {
    const tooltipNode = this.tooltip.node();
    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;
    
    let left = event.pageX + 10;
    let top = event.pageY - 10;

    // Keep tooltip within viewport
    if (left + tooltipWidth > window.innerWidth) {
      left = event.pageX - tooltipWidth - 10;
    }
    if (top + tooltipHeight > window.innerHeight) {
      top = event.pageY - tooltipHeight - 10;
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
   * Show empty state message
   * @private
   */
  _showEmptyState() {
    this.container.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #9ca3af;
        text-align: center;
        padding: 40px;
      ">
        <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">🌊</div>
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">
          No Trade Flow Data Available
        </div>
        <div style="font-size: 14px; opacity: 0.8;">
          Trade data with symbols, strategies, and outcomes is needed to show flow diagram
        </div>
      </div>
    `;
  }

  /**
   * Resize chart to fit container
   */
  resize() {
    if (this.data && this.data.nodes && this.data.nodes.length > 0) {
      this._render();
    }
  }

  /**
   * Destroy chart and clean up resources
   */
  destroy() {
    // Remove resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Remove tooltip
    if (this.tooltip) {
      this.tooltip.remove();
    }

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SankeyDiagramChart;
}
