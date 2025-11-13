/**
 * DataStore - Manages application state and localStorage persistence
 * 
 * Responsibilities:
 * - Persist trade data to localStorage
 * - Manage filter state
 * - Emit events on state changes
 * - Handle storage quota errors gracefully
 */
class DataStore {
  constructor() {
    this.TRADES_KEY = 'options_trading_journal_trades';
    this.FILTERS_KEY = 'options_trading_journal_filters';
    this.listeners = new Map();
    
    // Default filter state
    this.defaultFilters = {
      dateRange: {
        type: 'alltime',
        startDate: null,
        endDate: null
      },
      positionStatus: 'all'  // Changed from 'closed' to 'all' to show all trades by default
    };
  }

  /**
   * Load trades from localStorage
   * @returns {Array} - Stored trades or empty array
   */
  loadTrades() {
    try {
      const data = localStorage.getItem(this.TRADES_KEY);
      if (!data) {
        return [];
      }
      
      const trades = JSON.parse(data);
      
      // Parse date strings back to Date objects
      return trades.map(trade => ({
        ...trade,
        Entry: trade.Entry ? new Date(trade.Entry) : null,
        Exit: trade.Exit ? new Date(trade.Exit) : null,
        Expiry: trade.Expiry ? new Date(trade.Expiry) : null
      }));
    } catch (error) {
      console.error('Error loading trades from localStorage:', error);
      return [];
    }
  }

  /**
   * Save trades to localStorage
   * @param {Array} trades - Trades to persist
   * @throws {Error} - If localStorage quota exceeded
   */
  saveTrades(trades) {
    try {
      const serializedTrades = JSON.stringify(trades);
      localStorage.setItem(this.TRADES_KEY, serializedTrades);
      this.emit('tradesChanged', trades);
    } catch (error) {
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        const errorMsg = 'localStorage quota exceeded. Unable to save trade data.';
        console.error(errorMsg, error);
        throw new Error(errorMsg);
      }
      throw error;
    }
  }

  /**
   * Clear all stored trade data
   */
  clearTrades() {
    try {
      localStorage.removeItem(this.TRADES_KEY);
      this.emit('tradesCleared');
    } catch (error) {
      console.error('Error clearing trades from localStorage:', error);
    }
  }

  /**
   * Get current filter state
   * @returns {Object} - Current date range and position filter
   */
  getFilters() {
    try {
      const data = localStorage.getItem(this.FILTERS_KEY);
      if (!data) {
        return { ...this.defaultFilters };
      }
      
      const filters = JSON.parse(data);
      
      // Parse date strings back to Date objects
      if (filters.dateRange) {
        filters.dateRange.startDate = filters.dateRange.startDate 
          ? new Date(filters.dateRange.startDate) 
          : null;
        filters.dateRange.endDate = filters.dateRange.endDate 
          ? new Date(filters.dateRange.endDate) 
          : null;
      }
      
      return filters;
    } catch (error) {
      console.error('Error loading filters from localStorage:', error);
      return { ...this.defaultFilters };
    }
  }

  /**
   * Update filter state
   * @param {Object} filters - New filter values
   */
  setFilters(filters) {
    try {
      const serializedFilters = JSON.stringify(filters);
      localStorage.setItem(this.FILTERS_KEY, serializedFilters);
      this.emit('filtersChanged', filters);
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
      // Don't throw - filter persistence is not critical
    }
  }

  /**
   * Subscribe to state change events
   * @param {string} event - Event name ('tradesChanged', 'tradesCleared', 'filtersChanged')
   * @param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Check if localStorage is available and working
   * @returns {boolean} - True if localStorage is available
   */
  isLocalStorageAvailable() {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }
}
