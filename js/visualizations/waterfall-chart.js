/**
 * Waterfall Chart Component
 * Renders a waterfall chart showing P/L contributions by symbol
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */
class WaterfallChart {
  /**
   * Create Waterfall Chart
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Array} data - Array of {symbol, pl, cumulativePL} objects
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
    this.barWidth = 40;
    this.barGap = 10;
    this.options = {
      animationDuration: 750,
      maxSymbols: 15, // Requirement 9.7
      ...options
    };

    // Initialize chart
    this._initChart();
    
    // Set up resize observer (Requirement 9.1)
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

    // Create control panel for configuration
    const controlPanel = document.createElement('div');
    controlPanel.className = 'chart-controls';
    controlPanel.style.cssText = 'position: absolute; top: 10px; right: 10px; z-index: 10; display: flex; align-items: center; gap: 8px;';
    
    const label = document.createElement('label');
    label.textContent = 'Show:';
    label.style.cssText = 'color: #9ca3af; font-size: 12px;';
    
    const select = document.createElement('select');
    select.className = 'symbol-limit-select';
    select.style.cssText = 'background: #1f2937; color: #e5e7eb; border: 1px solid #374151; border-radius: 4px; padding: 4px 8px; font-size: 12px; cursor: pointer;';
    
    const options = [
      { value: 10, label: 'Top 10' },
      { value: 15, label: 'Top 15' },
      { value: 20, label: 'Top 20' },
      { value: 30, label: 'Top 30' },
      { value: -1, label: 'All Symbols' }
    ];
    
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === this.options.maxSymbols) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    
    select.addEventListener('change', (e) => {
      const newLimit = parseInt(e.target.value);
      this.options.maxSymbols = newLimit;
      if (this.rawData) {
        this.update(this.rawData);
      }
    });
    
    controlPanel.appendChild(label);
    controlPanel.appendChild(select);
    this.container.appendChild(controlPanel);

    // Create SVG
    this.svg = d3.select(`#${this.containerId}`)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('class', 'waterfall-chart-svg');

    // Create main group for chart content
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Create groups for different chart elements
    this.axesGroup = this.chartGroup.append('g').attr('class', 'axes-group');
    this.connectorsGroup = this.chartGroup.append('g').attr('class', 'connectors-group');
    this.barsGroup = this.chartGroup.append('g').attr('class', 'bars-group');

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
   * @param {Array} data - Array of {symbol, pl, cumulativePL} objects
   * @param {Object} options - Update options
   */
  update(data, options = {}) {
    if (!data || data.length === 0) {
      this._showEmptyState();
      return;
    }

    // Store raw data for re-filtering
    this.rawData = data;

    // Apply symbol limit
    let filteredData = data;
    if (this.options.maxSymbols > 0) {
      filteredData = data.slice(0, this.options.maxSymbols);
    }

    // Store data
    this.data = filteredData;

    // Calculate cumulative values and prepare data (Requirement 9.1, 9.2)
    this.processedData = this._processData(filteredData);

    // Render chart
    this._render();
  }

  /**
   * Process data for waterfall chart
   * @param {Array} data - Raw data array
   * @returns {Array} - Processed data with cumulative calculations
   * @private
   */
  _processData(data) {
    // Sort by absolute P/L and limit to top symbols (Requirement 9.7)
    const sortedData = [...data]
      .sort((a, b) => Math.abs(b.pl) - Math.abs(a.pl))
      .slice(0, this.options.maxSymbols);

    // Calculate cumulative values (Requirement 9.1)
    let cumulative = 0;
    const processed = sortedData.map((d, i) => {
      const start = cumulative;
      cumulative += d.pl;
      return {
        symbol: d.symbol,
        pl: d.pl,
        start: start,
        end: cumulative,
        isPositive: d.pl > 0,
        index: i
      };
    });

    // Add total bar (Requirement 9.5)
    processed.push({
      symbol: 'Total',
      pl: cumulative,
      start: 0,
      end: cumulative,
      isTotal: true,
      index: processed.length
    });

    return processed;
  }

  /**
   * Render the waterfall chart
   * @private
   */
  _render() {
    // Get container dimensions
    const containerRect = this.container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    // Calculate chart dimensions
    const chartWidth = Math.max(width - this.margin.left - this.margin.right, 200);
    const chartHeight = Math.max(height - this.margin.top - this.margin.bottom, 200);

    // Update SVG size
    this.svg
      .attr('width', width)
      .attr('height', height);

    // Create scales
    const xScale = d3.scaleBand()
      .domain(this.processedData.map(d => d.symbol))
      .range([0, chartWidth])
      .padding(0.2);

    // Find min and max for Y scale
    const allValues = this.processedData.flatMap(d => [d.start, d.end]);
    const yMin = Math.min(0, ...allValues);
    const yMax = Math.max(0, ...allValues);
    const yPadding = (yMax - yMin) * 0.1;

    const yScale = d3.scaleLinear()
      .domain([yMin - yPadding, yMax + yPadding])
      .range([chartHeight, 0])
      .nice();

    // Render axes
    this._renderAxes(xScale, yScale, chartWidth, chartHeight);

    // Render connector lines (Requirement 9.2)
    this._renderConnectors(xScale, yScale);

    // Render bars (Requirement 9.3, 9.4)
    this._renderBars(xScale, yScale);
  }

  /**
   * Render chart axes
   * @private
   */
  _renderAxes(xScale, yScale, chartWidth, chartHeight) {
    // Clear existing axes
    this.axesGroup.selectAll('*').remove();

    // X-axis
    const xAxis = d3.axisBottom(xScale);
    
    this.axesGroup.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('fill', '#9ca3af')
      .style('font-size', '11px');

    // Y-axis
    const yAxis = d3.axisLeft(yScale)
      .ticks(8)
      .tickFormat(d => `$${d3.format(',.0f')(d)}`);
    
    this.axesGroup.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('fill', '#9ca3af')
      .style('font-size', '11px');

    // Style axis lines
    this.axesGroup.selectAll('.domain, .tick line')
      .style('stroke', '#374151');

    // Y-axis label
    this.axesGroup.append('text')
      .attr('class', 'y-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -60)
      .attr('text-anchor', 'middle')
      .style('fill', '#9ca3af')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text('Cumulative P/L ($)');

    // Zero line
    if (yScale.domain()[0] < 0 && yScale.domain()[1] > 0) {
      this.axesGroup.append('line')
        .attr('class', 'zero-line')
        .attr('x1', 0)
        .attr('x2', chartWidth)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .style('stroke', '#6b7280')
        .style('stroke-width', 1)
        .style('stroke-dasharray', '4,4');
    }
  }

  /**
   * Render connector lines between bars
   * @private
   */
  _renderConnectors(xScale, yScale) {
    // Clear existing connectors
    this.connectorsGroup.selectAll('*').remove();

    // Draw connectors between bars (Requirement 9.2)
    const connectors = this.connectorsGroup.selectAll('.connector')
      .data(this.processedData.slice(0, -1)); // Exclude total bar

    connectors.enter()
      .append('line')
      .attr('class', 'connector')
      .merge(connectors)
      .attr('x1', d => xScale(d.symbol) + xScale.bandwidth())
      .attr('x2', (d, i) => xScale(this.processedData[i + 1].symbol))
      .attr('y1', d => yScale(d.end))
      .attr('y2', d => yScale(d.end))
      .style('stroke', '#6b7280')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '2,2')
      .style('opacity', 0)
      .transition()
      .duration(this.options.animationDuration)
      .delay((d, i) => i * 50)
      .style('opacity', 0.5);

    connectors.exit().remove();
  }

  /**
   * Render waterfall bars
   * @private
   */
  _renderBars(xScale, yScale) {
    // Clear existing bars
    this.barsGroup.selectAll('*').remove();

    // Bind data
    const bars = this.barsGroup.selectAll('.bar')
      .data(this.processedData);

    // Enter + Update
    const barsEnter = bars.enter()
      .append('rect')
      .attr('class', 'bar');

    barsEnter.merge(bars)
      .attr('x', d => xScale(d.symbol))
      .attr('width', xScale.bandwidth())
      .attr('y', d => yScale(Math.max(d.start, d.end)))
      .attr('height', 0)
      .style('fill', d => {
        // Requirement 9.4: Color bars green (positive) or red (negative)
        if (d.isTotal) {
          return '#3b82f6'; // Accent color for total
        }
        return d.isPositive ? '#10b981' : '#ef4444';
      })
      .style('stroke', d => d.isTotal ? '#2563eb' : 'none')
      .style('stroke-width', d => d.isTotal ? 2 : 0)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => this._showTooltip(event, d))
      .on('mousemove', (event) => this._moveTooltip(event))
      .on('mouseout', () => this._hideTooltip())
      .transition()
      .duration(this.options.animationDuration)
      .delay((d, i) => i * 50)
      .attr('y', d => yScale(Math.max(d.start, d.end)))
      .attr('height', d => Math.abs(yScale(d.start) - yScale(d.end)));

    bars.exit().remove();
  }

  /**
   * Show tooltip with bar information
   * @private
   */
  _showTooltip(event, d) {
    // Requirement 9.6: Display symbol name and P/L contribution
    const formatCurrency = d3.format('$,.2f');
    
    let content = `
      <div style="font-weight: 600; margin-bottom: 4px; color: #f3f4f6;">
        ${d.symbol}
      </div>
    `;

    if (d.isTotal) {
      content += `
        <div style="color: #9ca3af;">
          Total P/L: <span style="color: ${d.pl >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">
            ${formatCurrency(d.pl)}
          </span>
        </div>
      `;
    } else {
      content += `
        <div style="color: #9ca3af;">
          Contribution: <span style="color: ${d.pl >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">
            ${formatCurrency(d.pl)}
          </span>
        </div>
        <div style="color: #9ca3af; font-size: 11px; margin-top: 2px;">
          Cumulative: ${formatCurrency(d.end)}
        </div>
      `;
    }

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
        <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📉</div>
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">
          No P/L Attribution Data Available
        </div>
        <div style="font-size: 14px; opacity: 0.8;">
          Trade data is needed to show P/L contributions by symbol
        </div>
      </div>
    `;
  }

  /**
   * Resize chart to fit container
   */
  resize() {
    if (this.processedData && this.processedData.length > 0) {
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
