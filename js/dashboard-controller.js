/**
 * Dashboard Controller Component
 * Orchestrates data flow between components and manages UI state
 * Requirements: 1.1, 8.3, 9.6, 12.1, 12.2, 12.3, 12.4, 12.5
 */
class DashboardController {
  constructor(dataStore, analyticsEngine, strategyDetector, csvParser) {
    this.dataStore = dataStore;
    this.analyticsEngine = analyticsEngine;
    this.strategyDetector = strategyDetector;
    this.csvParser = csvParser;

    // Visualization components
    this.visualizations = {};

    // Current enriched trades
    this.enrichedTrades = [];

    // Debounce timer for filter changes
    this.filterDebounceTimer = null;
    this.filterDebounceDelay = 300; // 300ms debounce (Requirement 8.3)

    // UI element references
    this.elements = {
      dashboard: document.getElementById('dashboard'),
      emptyState: document.getElementById('empty-state'),
      loadingSpinner: document.getElementById('loading-spinner'),
      toastContainer: document.getElementById('toast-container')
    };
  }

  /**
   * Initialize dashboard with visualization components
   * Sets up all chart instances and loads persisted data
   */
  initialize() {
    this.visualizations = {
      summaryMetrics: new SummaryMetricsPanel('summary-metrics-panel'),
      plTrend: new PLTrendChart('pl-trend-chart'),
      waterfall: new WaterfallChart('waterfall-chart'),
      tradeFlow: new SankeyDiagramChart('trade-flow-chart'),
      costBasis: new CostBasisChart('cost-basis-chart'),
      winRate: new WinRateChart('win-rate-chart'),
      plBreakdown: new PLBreakdownChart('pl-breakdown-chart'),
      bubble: new BubbleChart('bubble-chart'),
      heatmap: new HeatmapCalendarChart('heatmap-chart'),
      monthlyPL: new MonthlyPLChart('monthly-pl-chart'),
      horizon: new HorizonChart('horizon-chart'),
      scatter: new ScatterPlotChart('scatter-chart'),
      winLossDonut: new WinLossDonutChart('win-loss-donut-chart'),
      violin: new ViolinPlotChart('violin-chart')
    };

    this.lazy = new LazyRenderer();
    this.reportNav = new ReportNav();
    this.reportNav.initialize();
    this.initializeScatterToggle();
    this.initializeSelection();

    // Some charts work out colors while drawing (calendar cells, Sankey,
    // bubble scale), so redraw from the current filters when the theme flips
    ThemeColors.onChange(() => {
      if (this.enrichedTrades.length > 0) this.refreshDashboard();
    });

    // Research tab (Requirement 5.1)
    this.researchPanel = new ResearchPanel('research-panel');
    this.researchPanel.initialize();
    ResearchOutputs.register(this.researchPanel);

    this.initializePLMeasureToggle();

    // Initialize collapsible section for table (Requirements: 1.1, 1.2, 1.3)
    this.collapsibleSection = new CollapsibleSection('symbol-strategy-section-container', {
      title: 'P/L by Symbol & Strategy',
      defaultExpanded: false, // Collapsed by default (Requirement 1.1)
      animationDuration: 300, // Smooth animation (Requirement 1.4)
      showSummary: true, // Show summary when collapsed (Requirement 1.5)
      summaryText: 'Loading...', // Initial summary text
      persistState: true, // Persist state to localStorage (Requirement 1.3)
      storageKey: 'symbol_strategy_table_state'
    });
    this.collapsibleSection.initialize();

    // Load persisted trades from data store
    const storedTrades = this.dataStore.loadTrades();

    if (storedTrades && storedTrades.length > 0) {
      // Enrich trades and show dashboard
      this.enrichedTrades = storedTrades.map(trade =>
        this.analyticsEngine.enrichTrade(trade)
      );
      this.showDashboard();
      this.refreshDashboard();
      this.reportNav.restoreChapter();
    } else {
      // Show empty state (Requirement 12.4)
      this.showEmptyState();
    }
  }

  /**
   * Handle CSV file upload
   * Orchestrates parsing, enrichment, and storage
   * @param {File} file - CSV file from file input
   */
  async handleFileUpload(file) {
    try {
      // Show loading spinner (Requirement 12.5)
      this.showLoading();

      // Parse CSV file (Requirement 1.1)
      const rawTrades = await this.csvParser.parse(file);

      // Enrich trades with computed fields
      this.enrichedTrades = rawTrades.map(trade => {
        // Apply strategy detection
        const detectedStrategy = this.strategyDetector.detect(trade);
        trade.Strategy = detectedStrategy;

        // Enrich with analytics
        return this.analyticsEngine.enrichTrade(trade);
      });

      // Save to data store
      try {
        this.dataStore.saveTrades(this.enrichedTrades);
      } catch (storageError) {
        console.warn('Failed to save to localStorage:', storageError);
        // Handle localStorage quota exceeded (Requirement 12.3)
        this.showToast(
          'Warning: Unable to save data to browser storage. Your trades will not persist after closing the browser.',
          'warning',
          5000
        );
      }

      // Hide loading and show dashboard
      this.hideLoading();
      this.showDashboard();
      this.refreshDashboard();

      // Show success notification (Requirement 12.2)
      this.showToast(
        `Successfully loaded ${this.enrichedTrades.length} trade${this.enrichedTrades.length !== 1 ? 's' : ''}`,
        'success'
      );

    } catch (error) {
      // Hide loading
      this.hideLoading();

      // Log detailed error for debugging
      console.error('File upload error:', error);

      // Show error modal with details (Requirement 12.1)
      this.showErrorModal(error);
    }
  }

  /**
   * Handle filter changes with debouncing
   * @param {Object} filters - New filter values
   */
  handleFilterChange(filters) {
    // Clear existing debounce timer
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer);
    }

    // Debounce filter updates (300ms delay)
    this.filterDebounceTimer = setTimeout(() => {
      // Save filter state
      this.dataStore.setFilters(filters);

      // Refresh dashboard with new filters
      this.refreshDashboard();
    }, this.filterDebounceDelay);
  }

  /**
   * Refresh all visualizations with current data and filters
   * Applies filters and updates all chart components
   */
  refreshDashboard() {
    if (!this.enrichedTrades || this.enrichedTrades.length === 0) {
      this.showEmptyState();
      return;
    }

    // Get current filters
    const filters = this.dataStore.getFilters();

    // Apply filters to trades
    let filteredTrades = this.enrichedTrades;

    // Apply date range filter (Requirement 8.3)
    filteredTrades = this.analyticsEngine.filterByDateRange(
      filteredTrades,
      filters.dateRange.type
    );

    // Apply position status filter (Requirement 9.6)
    filteredTrades = this.analyticsEngine.filterByStatus(
      filteredTrades,
      filters.positionStatus
    );

    // Symbol and strategy picks from clicking the charts
    this.pruneSelection();
    const { symbols, strategies } = this.selection;
    if (symbols.length > 0) {
      filteredTrades = filteredTrades.filter(trade => symbols.includes(trade.Symbol));
    }
    if (strategies.length > 0) {
      filteredTrades = filteredTrades.filter(trade => strategies.includes(trade.Strategy));
    }
    this.renderSelectionChips();
    this.syncFilterHash(filters);

    // Note: Don't show empty state if we have enriched trades but filters result in no matches
    // Instead, let the visualizations show their own empty states

    const engine = this.analyticsEngine;
    const trades = filteredTrades;
    const charts = this.visualizations;

    const summaryMetrics = engine.calculateSummaryMetrics(trades);
    try {
      charts.summaryMetrics.update(summaryMetrics);
    } catch (e) {
      console.error('Summary Metrics error:', e);
    }

    // Each chart computes and draws only once its card is on screen
    const renders = {
      plTrend: () => engine.calculateMonthlyPL(trades),
      waterfall: () => engine.calculateWaterfallData(trades, 999),
      tradeFlow: () => this.sizeTradeFlow(engine.calculateSankeyData(trades, 20)),
      costBasis: () => engine.calculateCostBasisBySymbol(trades),
      winRate: () => engine.calculateWinRateByStrategy(trades),
      plBreakdown: () => engine.calculatePLBreakdown(trades, ['Strategy']),
      bubble: () => engine.calculateBubbleData(trades),
      heatmap: () => engine.calculateDailyPL(trades),
      monthlyPL: () => engine.calculateRadialData(trades),
      horizon: () => engine.calculateHorizonData(trades),
      scatter: () => (this.scatterData = engine.calculateScatterData(trades)),
      winLossDonut: () => engine.calculateWinLossDistribution(trades),
      violin: () => engine.calculateViolinData(trades)
    };

    Object.entries(renders).forEach(([key, compute]) => {
      const chart = charts[key];
      if (!chart || !chart.container) return;
      this.lazy.schedule(chart.container, () => chart.update(compute()));
    });

    const plBySymbolStrategy = engine.calculatePLBreakdown(trades, ['Symbol', 'Strategy']);
    try {
      this.updateTable(plBySymbolStrategy);
    } catch (e) {
      console.error('Table error:', e);
    }

    this.updateRailMeta(trades, summaryMetrics);
    this.renderHeadlines(trades);

    // Update research tab with the same filtered set (Requirement 5.5)
    if (this.researchPanel) {
      try {
        this.researchPanel.update(trades);
      } catch (e) {
        console.error('Research Panel error:', e);
      }
    }

    console.log('=== refreshDashboard END ===');
  }

  /**
   * Size the Sankey to its tallest column so a handful of symbols doesn't
   * float in a 1000px box and twenty don't get squashed.
   */
  sizeTradeFlow(sankeyData) {
    const container = this.visualizations.tradeFlow?.container;
    if (container && sankeyData && sankeyData.nodes) {
      const perLayer = {};
      sankeyData.nodes.forEach(node => {
        perLayer[node.layer] = (perLayer[node.layer] || 0) + 1;
      });
      const tallest = Math.max(1, ...Object.values(perLayer));
      const height = Math.min(1000, Math.max(380, tallest * 44 + 100));
      container.style.height = `${height}px`;
      container.style.minHeight = `${height}px`;
    }
    return sankeyData;
  }

  /**
   * Short figures beside each chapter in the report rail
   */
  updateRailMeta(trades, summaryMetrics) {
    if (!this.reportNav) return;
    const closed = trades.filter(trade => trade.Result !== 'Open');
    const count = key => new Set(closed.map(trade => trade[key])).size;
    const months = new Set(closed.map(trade => {
      const date = this.analyticsEngine._parseDate(trade.Exit || trade.Entry);
      return !date || isNaN(date) ? null : `${date.getFullYear()}-${date.getMonth()}`;
    }).filter(Boolean)).size;
    const pl = summaryMetrics.realizedPL ?? summaryMetrics.totalPL ?? 0;

    this.reportNav.setMeta('snapshot', this.formatCurrency(pl), pl >= 0 ? 'profit' : 'loss');
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    this.reportNav.setMeta('sources', plural(count('Symbol'), 'symbol', 'symbols'));
    this.reportNav.setMeta('strategies', plural(count('Strategy'), 'strategy', 'strategies'));
    this.reportNav.setMeta('timing', months ? `${months} months` : '');
    this.reportNav.setMeta('outcomes', `${Math.round(summaryMetrics.winRate || 0)}% win`);
  }

  /**
   * Cross-filtering: clicking a symbol or strategy in a chart or the table
   * narrows the whole report to it. Picks live in the URL hash, not in
   * localStorage, so a new upload never opens pre-filtered by surprise.
   */
  initializeSelection() {
    const { params } = HashState.read();
    const list = key => (params.get(key) || '').split(',').map(v => v.trim()).filter(Boolean);
    this.selection = { symbols: list('symbol'), strategies: list('strategy') };

    // Date range and status from a shared link win over the stored ones
    const range = params.get('range');
    const status = params.get('status');
    if (range || status) {
      const filters = this.dataStore.getFilters();
      if (range) filters.dateRange = { ...filters.dateRange, type: range };
      if (status) filters.positionStatus = status;
      this.dataStore.setFilters(filters);
    }

    const select = (dimension, value) => this.toggleSelection(dimension, value);
    ['waterfall', 'tradeFlow', 'costBasis', 'winRate', 'plBreakdown', 'bubble'].forEach(key => {
      if (this.visualizations[key]) this.visualizations[key].onSelect = select;
    });

    document.addEventListener('click', event => {
      const cell = event.target.closest('[data-select]');
      if (cell) {
        this.toggleSelection(cell.dataset.select, cell.dataset.value);
        return;
      }
      const chip = event.target.closest('[data-chip]');
      if (chip) {
        if (chip.dataset.chip === 'all') {
          this.selection = { symbols: [], strategies: [] };
        } else {
          const key = chip.dataset.chip === 'symbol' ? 'symbols' : 'strategies';
          this.selection[key] = this.selection[key].filter(v => v !== chip.dataset.value);
        }
        this.refreshDashboard();
      }
    });

    window.addEventListener('hashchange', () => {
      const next = HashState.read().params;
      const same = key => (next.get(key) || '') === this.selection[`${key === 'symbol' ? 'symbols' : 'strategies'}`].join(',');
      if (same('symbol') && same('strategy')) return;
      this.selection = {
        symbols: (next.get('symbol') || '').split(',').filter(Boolean),
        strategies: (next.get('strategy') || '').split(',').filter(Boolean)
      };
      this.refreshDashboard();
    });
  }

  toggleSelection(dimension, value) {
    if (!value) return;
    const key = dimension === 'symbol' ? 'symbols' : 'strategies';
    const list = this.selection[key];
    this.selection[key] = list.includes(value)
      ? list.filter(v => v !== value)
      : [...list, value];
    this.refreshDashboard();
  }

  /** Drop picks that no longer exist, e.g. after loading a different file. */
  pruneSelection() {
    const symbols = new Set(this.enrichedTrades.map(trade => trade.Symbol));
    const strategies = new Set(this.enrichedTrades.map(trade => trade.Strategy));
    this.selection.symbols = this.selection.symbols.filter(v => symbols.has(v));
    this.selection.strategies = this.selection.strategies.filter(v => strategies.has(v));
  }

  renderSelectionChips() {
    const host = document.getElementById('filter-chips');
    if (!host) return;
    host.replaceChildren();

    const chips = [
      ...this.selection.symbols.map(value => ['symbol', 'Symbol', value]),
      ...this.selection.strategies.map(value => ['strategy', 'Strategy', value])
    ];
    host.classList.toggle('hidden', chips.length === 0);

    chips.forEach(([dimension, label, value]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'filter-chip';
      chip.dataset.chip = dimension;
      chip.dataset.value = value;
      chip.setAttribute('aria-label', `Remove ${label} filter ${value}`);
      const name = document.createElement('span');
      name.className = 'filter-chip-key';
      name.textContent = `${label}:`;
      const x = document.createElement('span');
      x.className = 'filter-chip-x';
      x.setAttribute('aria-hidden', 'true');
      x.textContent = '×';
      chip.append(name, ` ${value} `, x);
      host.appendChild(chip);
    });

    if (chips.length > 1) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'filter-chip-clear';
      clear.dataset.chip = 'all';
      clear.textContent = 'Clear all';
      host.appendChild(clear);
    }
  }

  syncFilterHash(filters) {
    const params = new URLSearchParams();
    if (this.selection.symbols.length) params.set('symbol', this.selection.symbols.join(','));
    if (this.selection.strategies.length) params.set('strategy', this.selection.strategies.join(','));
    const range = filters.dateRange && filters.dateRange.type;
    if (range && range !== 'alltime') params.set('range', range);
    if (filters.positionStatus && filters.positionStatus !== 'all') params.set('status', filters.positionStatus);
    HashState.update({ params });
  }

  /**
   * Sentences at the top of Snapshot; clicking one applies its filter
   */
  renderHeadlines(trades) {
    const list = document.getElementById('snapshot-headlines');
    if (!list) return;
    list.replaceChildren();

    const headlines = SnapshotHeadlines.build(trades);
    list.classList.toggle('hidden', headlines.length === 0);

    headlines.forEach(headline => {
      const { dimension, values } = headline.action;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'headline';
      button.dataset.headline = headline.id;
      button.setAttribute('aria-label', `${SnapshotHeadlines.toText(headline)} Filter the report to ${values.join(' and ')}.`);

      headline.parts.forEach(part => {
        if (!part.strong && !part.tone) {
          button.append(part.text);
          return;
        }
        const span = document.createElement('span');
        span.className = part.tone ? `headline-figure text-${part.tone}` : 'headline-figure';
        span.textContent = part.text;
        button.appendChild(span);
      });

      button.addEventListener('click', () => {
        const key = dimension === 'symbol' ? 'symbols' : 'strategies';
        this.selection[key] = [...values];
        this.refreshDashboard();
      });

      const item = document.createElement('li');
      item.appendChild(button);
      list.appendChild(item);
    });
  }

  selectableCell(dimension, value) {
    const cell = document.createElement('td');
    if (!value) {
      cell.textContent = 'Unknown';
      return cell;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cell-select';
    button.dataset.select = dimension;
    button.dataset.value = value;
    button.title = `Filter the report to ${value}`;
    button.textContent = value;
    cell.appendChild(button);
    return cell;
  }

  /**
   * The holding-period scatter can plot days held or DTE at entry
   */
  initializeScatterToggle() {
    const buttons = document.querySelectorAll('[data-scatter-x]');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const field = button.dataset.scatterX;
        const label = field === 'daysToExpire' ? 'DTE at Entry' : 'Days Held';
        buttons.forEach(other => {
          const on = other === button;
          other.classList.toggle('active', on);
          other.setAttribute('aria-checked', String(on));
        });
        const title = document.getElementById('scatter-x-title');
        if (title) title.textContent = label;

        const chart = this.visualizations.scatter;
        chart.options.xField = field;
        chart.options.xLabel = label;
        if (this.scatterData) chart.update(this.scatterData);
      });
    });
  }

  /**
   * Update the Symbol & Strategy table
   * @param {Array} data - P/L breakdown data
   * @private
   */
  updateTable(data) {
    const table = document.getElementById('symbol-strategy-table');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-text-secondary py-8">
            No data available for current filters
          </td>
        </tr>
      `;

      // Update collapsible section summary (Requirement 1.5)
      if (this.collapsibleSection) {
        this.collapsibleSection.updateSummary('No data available');
      }
      return;
    }

    // Store original data for sorting (don't pre-sort here)
    this.tableData = [...data];

    const gross = this.plMeasure === 'gross';
    const valueOf = item => (gross ? item.plGross : item.pl);
    const countOf = item => (gross ? item.realizedCount : item.tradeCount);

    const visible = data
      .filter(item => countOf(item) > 0)
      .sort((a, b) => valueOf(b) - valueOf(a));

    visible.forEach(item => {
      const row = document.createElement('tr');
      const value = valueOf(item);
      const plColor = value >= 0 ? 'text-profit' : 'text-loss';

      row.append(
        this.selectableCell('symbol', item.dimensions.Symbol),
        this.selectableCell('strategy', item.dimensions.Strategy)
      );
      row.insertAdjacentHTML('beforeend', `
        <td class="font-mono">${countOf(item)}</td>
        <td class="font-mono ${plColor}">${this.formatCurrency(value)}</td>
      `);

      tbody.appendChild(row);
    });

    // Update collapsible section summary with row count (Requirement 1.5)
    if (this.collapsibleSection) {
      const rowText = visible.length === 1 ? 'row' : 'rows';
      this.collapsibleSection.updateSummary(`${visible.length} ${rowText} available`);
    }
  }

  /**
   * Wire the net/gross toggle above the Symbol & Strategy table
   *
   * Net is what the position actually returned after costs. Gross matches the
   * P/L column of a broker statement, which reports commissions and fees
   * separately, so it is the measure to reconcile against.
   */
  initializePLMeasureToggle() {
    let stored = null;
    try {
      stored = localStorage.getItem('pl_measure');
    } catch (error) {
      console.warn('Could not read P/L measure preference:', error);
    }

    this.plMeasure = stored === 'gross' ? 'gross' : 'net';

    // Delegated, because CollapsibleSection rebuilds the section's innerHTML
    // when it initializes and would drop listeners bound to the buttons here
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-pl-measure]');
      if (!button) return;

      this.plMeasure = button.dataset.plMeasure;
      try {
        localStorage.setItem('pl_measure', this.plMeasure);
      } catch (error) {
        console.warn('Could not persist P/L measure preference:', error);
      }
      this.syncPLMeasureToggle();
      if (this.tableData) this.updateTable(this.tableData);
    });

    this.syncPLMeasureToggle();
  }

  syncPLMeasureToggle() {
    const gross = this.plMeasure === 'gross';

    document.querySelectorAll('[data-pl-measure]').forEach(button => {
      const active = button.dataset.plMeasure === this.plMeasure;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', String(active));
    });

    const column = document.getElementById('pl-measure-column');
    if (column) column.textContent = gross ? 'P/L (gross)' : 'P/L (net)';

    const caption = document.getElementById('pl-measure-caption');
    if (caption) {
      caption.textContent = gross
        ? 'Gross of commissions and fees, counting every retired leg including legs of positions still open. '
          + 'This is the measure that matches the P/L column of a broker statement.'
        : 'Net of commissions and fees, for positions that are fully closed. '
          + 'This is what each strategy actually returned.';
    }
  }

  /**
   * Show loading spinner
   * @private
   */
  showLoading() {
    if (this.elements.loadingSpinner) {
      this.elements.loadingSpinner.classList.remove('hidden');
    }
  }

  /**
   * Hide loading spinner
   * @private
   */
  hideLoading() {
    if (this.elements.loadingSpinner) {
      this.elements.loadingSpinner.classList.add('hidden');
    }
  }

  /**
   * Show dashboard and hide empty state
   * @private
   */
  showDashboard() {
    if (this.elements.dashboard) {
      this.elements.dashboard.classList.remove('hidden');
    }
    if (this.elements.emptyState) {
      this.elements.emptyState.classList.add('hidden');
    }
  }

  /**
   * Show empty state and hide dashboard
   * @private
   */
  showEmptyState() {
    if (this.elements.dashboard) {
      this.elements.dashboard.classList.add('hidden');
    }
    if (this.elements.emptyState) {
      this.elements.emptyState.classList.remove('hidden');
    }
  }

  /**
   * Show toast notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type: 'success', 'error', 'warning'
   * @param {number} duration - Duration in milliseconds (default: 3000)
   */
  showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon based on type
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠'
    };

    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="toast-icon">${icons[type] || icons.success}</span>
        <span>${message}</span>
      </div>
    `;

    this.elements.toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.classList.add('toast-show');
    }, 10);

    // Auto-remove after duration
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }

  /**
   * Show error modal with CSV parsing errors
   * @param {Error} error - Error object from CSV parser
   */
  showErrorModal(error) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    modal.id = 'error-modal';

    // Format error message
    let errorMessage = error.message || 'An unknown error occurred';

    // Check if it's a ParseError with row numbers
    if (error.name === 'ParseError') {
      errorMessage = errorMessage.replace(/\n/g, '<br>');
    }

    modal.innerHTML = `
      <div class="bg-surface border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex items-start justify-between mb-4">
          <h2 class="text-xl font-semibold text-loss">CSV Parsing Error</h2>
          <button id="close-error-modal" class="text-text-secondary hover:text-text-primary" aria-label="Close error modal">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="bg-background border border-border rounded p-4 mb-4 font-mono text-sm overflow-x-auto">
          <pre class="whitespace-pre-wrap text-text-secondary">${errorMessage}</pre>
        </div>
        <div class="text-sm text-text-secondary mb-4">
          <p>Please check your CSV file and ensure:</p>
          <ul class="list-disc list-inside mt-2 space-y-1">
            <li>All required fields are present</li>
            <li>Date formats are valid (YYYY-MM-DD or MM/DD/YYYY)</li>
            <li>Numeric fields contain valid numbers</li>
            <li>No extra commas or special characters</li>
          </ul>
        </div>
        <button id="close-error-modal-btn" class="btn-primary w-full">Close</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Add close handlers
    const closeModal = () => {
      modal.remove();
    };

    document.getElementById('close-error-modal').addEventListener('click', closeModal);
    document.getElementById('close-error-modal-btn').addEventListener('click', closeModal);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  /**
   * Clear all data and reset to empty state
   */
  clearData() {
    this.enrichedTrades = [];
    this.dataStore.clearTrades();
    this.showEmptyState();
  }

  /**
   * Format currency values
   * @param {number} value - Numeric value
   * @returns {string} - Formatted currency string
   * @private
   */
  formatCurrency(value) {
    const sign = value >= 0 ? '+$' : '-$';
    const absValue = Math.abs(value);
    return sign + absValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Destroy dashboard and clean up resources
   */
  destroy() {
    // Clear debounce timer
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer);
    }

    // Destroy all visualizations
    Object.values(this.visualizations).forEach(viz => {
      if (viz && typeof viz.destroy === 'function') {
        viz.destroy();
      }
    });

    this.visualizations = {};

    // Destroy collapsible section
    if (this.collapsibleSection && typeof this.collapsibleSection.destroy === 'function') {
      this.collapsibleSection.destroy();
      this.collapsibleSection = null;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardController;
}
