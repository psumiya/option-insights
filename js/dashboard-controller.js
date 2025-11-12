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
    // Initialize visualization components
    this.visualizations = {
      plTrend: new PLTrendChart('pl-trend-chart'),
      winRate: new WinRateChart('win-rate-chart'),
      plBreakdown: new PLBreakdownChart('pl-breakdown-chart'),
      strategyPerformance: new StrategyPerformanceChart('strategy-performance-chart'),
      symbolPL: new SymbolPLChart('symbol-pl-chart')
    };

    // Load persisted trades from data store
    const storedTrades = this.dataStore.loadTrades();
    
    if (storedTrades && storedTrades.length > 0) {
      // Enrich trades and show dashboard
      this.enrichedTrades = storedTrades.map(trade => 
        this.analyticsEngine.enrichTrade(trade)
      );
      this.showDashboard();
      this.refreshDashboard();
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

    // Calculate analytics data
    const monthlyPL = this.analyticsEngine.calculateMonthlyPL(filteredTrades);
    const winRateData = this.analyticsEngine.calculateWinRateByStrategy(filteredTrades);
    const plByStrategy = this.analyticsEngine.calculatePLBreakdown(filteredTrades, ['Strategy']);
    const plBySymbol = this.analyticsEngine.calculatePLBreakdown(filteredTrades, ['Symbol']);
    const plByTypeStrategy = this.analyticsEngine.calculatePLBreakdown(filteredTrades, ['Type', 'Strategy']);
    const plBySymbolStrategy = this.analyticsEngine.calculatePLBreakdown(filteredTrades, ['Symbol', 'Strategy']);

    // Update visualizations
    this.visualizations.plTrend.update(monthlyPL);
    this.visualizations.winRate.update(winRateData);
    this.visualizations.plBreakdown.update(plByStrategy);
    this.visualizations.symbolPL.update(plBySymbol);
    this.visualizations.strategyPerformance.update(plByTypeStrategy);

    // Update table
    this.updateTable(plBySymbolStrategy);
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
      return;
    }

    data.forEach(item => {
      const row = document.createElement('tr');
      const plColor = item.pl >= 0 ? 'text-profit' : 'text-loss';
      
      row.innerHTML = `
        <td>${item.dimensions.Symbol || 'Unknown'}</td>
        <td>${item.dimensions.Strategy || 'Unknown'}</td>
        <td class="font-mono">${item.tradeCount}</td>
        <td class="font-mono ${plColor}">${this.formatCurrency(item.pl)}</td>
      `;
      
      tbody.appendChild(row);
    });
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
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardController;
}
