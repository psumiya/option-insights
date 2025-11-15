/**
 * AdvancedVisualizationPanel - Manages tabbed interface for advanced visualizations
 * 
 * This component provides a tabbed interface that allows users to switch between
 * different visualization types. It handles tab registration, state persistence,
 * and lazy rendering of visualizations.
 */
class AdvancedVisualizationPanel {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    
    this.options = {
      defaultTab: options.defaultTab || null,
      storageKey: options.storageKey || 'advanced-viz-active-tab',
      fadeTransitionDuration: options.fadeTransitionDuration || 200,
      showLoadingIndicator: options.showLoadingIndicator !== false,
      loadingThreshold: options.loadingThreshold || 100,
      ...options
    };
    
    this.tabs = new Map(); // Map<tabId, { label, icon, component }>
    this.activeTabId = null;
    this.isTransitioning = false;
    this.currentData = null;
    
    // DOM elements
    this.tabsContainer = null;
    this.contentContainer = null;
    this.loadingIndicator = null;
  }
  
  /**
   * Initialize the panel with tabs and content containers
   */
  initialize() {
    // Clear existing content
    this.container.innerHTML = '';
    
    // Create main panel structure
    this.container.className = 'advanced-viz-panel';
    
    // Create tabs container
    this.tabsContainer = document.createElement('div');
    this.tabsContainer.className = 'viz-tabs';
    this.container.appendChild(this.tabsContainer);
    
    // Create content container
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'viz-content';
    this.container.appendChild(this.contentContainer);
    
    // Create loading indicator
    if (this.options.showLoadingIndicator) {
      this.loadingIndicator = document.createElement('div');
      this.loadingIndicator.className = 'viz-loading';
      this.loadingIndicator.innerHTML = '<div class="spinner"></div><span>Loading visualization...</span>';
      this.loadingIndicator.style.display = 'none';
      this.contentContainer.appendChild(this.loadingIndicator);
    }
    
    // Restore active tab from localStorage if available
    const savedTab = this._loadActiveTabFromStorage();
    if (savedTab && this.tabs.has(savedTab)) {
      this.activeTabId = savedTab;
    }
    
    return this;
  }
  
  /**
   * Register a visualization component with a tab
   * @param {string} tabId - Unique identifier for the tab
   * @param {string} tabLabel - Display label for the tab
   * @param {Object} visualizationComponent - Visualization component instance
   * @param {Object} options - Additional options (icon, etc.)
   */
  registerVisualization(tabId, tabLabel, visualizationComponent, options = {}) {
    if (this.tabs.has(tabId)) {
      console.warn(`Tab with id "${tabId}" already registered. Overwriting.`);
    }
    
    this.tabs.set(tabId, {
      label: tabLabel,
      icon: options.icon || '',
      component: visualizationComponent
    });
    
    // Render the tab button
    this._renderTab(tabId);
    
    // If this is the first tab or matches the saved/default tab, activate it
    if (!this.activeTabId || 
        (this.options.defaultTab === tabId && !this._loadActiveTabFromStorage()) ||
        this._loadActiveTabFromStorage() === tabId) {
      this.switchTab(tabId);
    }
    
    return this;
  }
  
  /**
   * Switch to a specific tab
   * @param {string} tabId - ID of the tab to switch to
   */
  switchTab(tabId) {
    if (!this.tabs.has(tabId)) {
      console.error(`Tab with id "${tabId}" not found`);
      return;
    }
    
    if (this.activeTabId === tabId || this.isTransitioning) {
      return;
    }
    
    const previousTabId = this.activeTabId;
    this.activeTabId = tabId;
    
    // Update tab button states
    this._updateTabStates();
    
    // Perform transition with fade effect
    this._transitionToTab(tabId, previousTabId);
    
    // Save active tab to localStorage
    this._saveActiveTabToStorage(tabId);
    
    return this;
  }
  
  /**
   * Update the active visualization with new data
   * @param {*} data - Data to pass to the visualization
   * @param {Object} options - Additional options to pass to the visualization
   */
  update(data, options = {}) {
    this.currentData = data;
    
    if (!this.activeTabId) {
      return;
    }
    
    const tab = this.tabs.get(this.activeTabId);
    if (!tab || !tab.component) {
      return;
    }
    
    // Show loading indicator if update might take time
    const startTime = Date.now();
    let loadingTimeout = null;
    
    if (this.options.showLoadingIndicator) {
      loadingTimeout = setTimeout(() => {
        this._showLoading();
      }, this.options.loadingThreshold);
    }
    
    // Update the visualization
    try {
      // Use requestAnimationFrame to ensure smooth rendering
      requestAnimationFrame(() => {
        if (tab.component && typeof tab.component.update === 'function') {
          tab.component.update(data, options);
        }
        
        // Clear loading indicator
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
        }
        this._hideLoading();
      });
    } catch (error) {
      console.error(`Error updating visualization "${this.activeTabId}":`, error);
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      this._hideLoading();
      this._showError(error.message);
    }
    
    return this;
  }
  
  /**
   * Get the currently active tab ID
   * @returns {string|null} Active tab ID or null if none active
   */
  getActiveTab() {
    return this.activeTabId;
  }
  
  /**
   * Handle export button click
   * Exports the current visualization as PNG (Requirements: 13.2, 13.3, 13.4, 13.5)
   * @private
   */
  async _handleExport() {
    if (!this.activeTabId || !window.html2canvas) {
      console.error('Cannot export: no active visualization or html2canvas not loaded');
      return;
    }
    
    const activeTab = this.tabs.get(this.activeTabId);
    if (!activeTab) return;
    
    try {
      // Disable export button during export
      this.exportButton.disabled = true;
      this.exportButton.innerHTML = '<span>Exporting...</span>';
      
      // Find the visualization container (the SVG or chart element)
      const vizElement = this.contentContainer.querySelector('svg, .chart-container');
      if (!vizElement) {
        throw new Error('No visualization element found to export');
      }
      
      // Create a wrapper div with title and filter info
      const exportWrapper = document.createElement('div');
      exportWrapper.style.cssText = 'background: white; padding: 20px; display: inline-block;';
      
      // Add title
      const title = document.createElement('h2');
      title.textContent = activeTab.label;
      title.style.cssText = 'margin: 0 0 10px 0; font-size: 18px; font-weight: 600; color: #1f2937;';
      exportWrapper.appendChild(title);
      
      // Add filter info (Requirement 13.4)
      const filterInfo = this._getFilterInfo();
      if (filterInfo) {
        const filterText = document.createElement('p');
        filterText.textContent = filterInfo;
        filterText.style.cssText = 'margin: 0 0 15px 0; font-size: 12px; color: #6b7280;';
        exportWrapper.appendChild(filterText);
      }
      
      // Clone the visualization element
      const vizClone = vizElement.cloneNode(true);
      exportWrapper.appendChild(vizClone);
      
      // Temporarily add to document for rendering
      exportWrapper.style.position = 'absolute';
      exportWrapper.style.left = '-9999px';
      document.body.appendChild(exportWrapper);
      
      // Generate canvas from the wrapper
      const canvas = await html2canvas(exportWrapper, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality (Requirement 13.5)
        logging: false,
        useCORS: true
      });
      
      // Remove temporary element
      document.body.removeChild(exportWrapper);
      
      // Convert canvas to blob and trigger download (Requirement 13.3)
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        const filename = `${activeTab.label.replace(/\s+/g, '-').toLowerCase()}-${date}.png`;
        
        link.href = url;
        link.download = filename;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        
        // Re-enable export button
        this.exportButton.disabled = false;
        this.exportButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 10v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2M8 2v8M11 7L8 10 5 7"/>
          </svg>
          <span>Export PNG</span>
        `;
      }, 'image/png');
      
    } catch (error) {
      console.error('Export failed:', error);
      
      // Re-enable export button
      this.exportButton.disabled = false;
      this.exportButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 10v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2M8 2v8M11 7L8 10 5 7"/>
        </svg>
        <span>Export PNG</span>
      `;
      
      // Show error to user
      alert('Failed to export visualization. Please try again.');
    }
  }
  
  /**
   * Get current filter information for export
   * @private
   * @returns {string|null} Filter description
   */
  _getFilterInfo() {
    try {
      const dateFilter = document.getElementById('date-range-filter');
      const statusFilter = document.getElementById('position-status-filter');
      
      if (!dateFilter || !statusFilter) return null;
      
      const dateText = dateFilter.options[dateFilter.selectedIndex].text;
      const statusText = statusFilter.options[statusFilter.selectedIndex].text;
      
      return `Filters: ${dateText} | ${statusText}`;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Destroy the panel and all visualizations
   */
  destroy() {
    // Destroy all visualization components
    this.tabs.forEach((tab) => {
      if (tab.component && typeof tab.component.destroy === 'function') {
        tab.component.destroy();
      }
    });
    
    // Clear data structures
    this.tabs.clear();
    this.activeTabId = null;
    this.currentData = null;
    
    // Clear DOM
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    return this;
  }
  
  // Private methods
  
  /**
   * Render a tab button
   * @private
   */
  _renderTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    
    const tabButton = document.createElement('button');
    tabButton.className = 'viz-tab';
    tabButton.dataset.tabId = tabId;
    tabButton.setAttribute('role', 'tab');
    tabButton.setAttribute('aria-selected', 'false');
    tabButton.setAttribute('aria-controls', `viz-content-${tabId}`);
    
    if (tab.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'viz-tab-icon';
      iconSpan.textContent = tab.icon;
      tabButton.appendChild(iconSpan);
    }
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'viz-tab-label';
    labelSpan.textContent = tab.label;
    tabButton.appendChild(labelSpan);
    
    // Add click handler
    tabButton.addEventListener('click', () => {
      this.switchTab(tabId);
    });
    
    // Add keyboard navigation
    tabButton.addEventListener('keydown', (e) => {
      this._handleTabKeydown(e, tabId);
    });
    
    this.tabsContainer.appendChild(tabButton);
  }
  
  /**
   * Update tab button states (active/inactive)
   * @private
   */
  _updateTabStates() {
    const tabButtons = this.tabsContainer.querySelectorAll('.viz-tab');
    tabButtons.forEach((button) => {
      const tabId = button.dataset.tabId;
      const isActive = tabId === this.activeTabId;
      
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    
    // Scroll active tab into view on mobile
    const activeButton = this.tabsContainer.querySelector('.viz-tab.active');
    if (activeButton && this.tabsContainer.scrollWidth > this.tabsContainer.clientWidth) {
      activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }
  
  /**
   * Transition to a new tab with fade effect
   * @private
   */
  _transitionToTab(newTabId, previousTabId) {
    this.isTransitioning = true;
    
    const newTab = this.tabs.get(newTabId);
    if (!newTab) {
      this.isTransitioning = false;
      return;
    }
    
    // Create a container for the new visualization if it doesn't exist
    let vizContainer = this.contentContainer.querySelector(`#viz-content-${newTabId}`);
    
    if (!vizContainer) {
      vizContainer = document.createElement('div');
      vizContainer.id = `viz-content-${newTabId}`;
      vizContainer.className = 'viz-content-inner';
      vizContainer.setAttribute('role', 'tabpanel');
      vizContainer.setAttribute('aria-labelledby', `tab-${newTabId}`);
      this.contentContainer.appendChild(vizContainer);
      
      // Initialize the visualization component with the container
      if (newTab.component && typeof newTab.component.initialize === 'function') {
        newTab.component.initialize(vizContainer);
      }
    }
    
    // Fade out previous content
    const allContainers = this.contentContainer.querySelectorAll('.viz-content-inner');
    allContainers.forEach((container) => {
      if (container.id !== `viz-content-${newTabId}`) {
        container.style.opacity = '0';
        container.style.display = 'none';
      }
    });
    
    // Fade in new content
    vizContainer.style.opacity = '0';
    vizContainer.style.display = 'block';
    
    // Use requestAnimationFrame for smooth transition
    requestAnimationFrame(() => {
      vizContainer.style.transition = `opacity ${this.options.fadeTransitionDuration}ms ease`;
      vizContainer.style.opacity = '1';
      
      // Update visualization with current data if available
      if (this.currentData && newTab.component && typeof newTab.component.update === 'function') {
        setTimeout(() => {
          newTab.component.update(this.currentData);
        }, this.options.fadeTransitionDuration / 2);
      }
      
      // Mark transition as complete
      setTimeout(() => {
        this.isTransitioning = false;
      }, this.options.fadeTransitionDuration);
    });
  }
  
  /**
   * Handle keyboard navigation for tabs
   * @private
   */
  _handleTabKeydown(event, currentTabId) {
    const tabIds = Array.from(this.tabs.keys());
    const currentIndex = tabIds.indexOf(currentTabId);
    
    let newIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowLeft':
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabIds.length - 1;
        event.preventDefault();
        break;
      case 'ArrowRight':
        newIndex = currentIndex < tabIds.length - 1 ? currentIndex + 1 : 0;
        event.preventDefault();
        break;
      case 'Home':
        newIndex = 0;
        event.preventDefault();
        break;
      case 'End':
        newIndex = tabIds.length - 1;
        event.preventDefault();
        break;
      case 'Enter':
      case ' ':
        this.switchTab(currentTabId);
        event.preventDefault();
        return;
      default:
        return;
    }
    
    if (newIndex !== currentIndex) {
      const newTabId = tabIds[newIndex];
      this.switchTab(newTabId);
      
      // Focus the new tab button
      const newButton = this.tabsContainer.querySelector(`[data-tab-id="${newTabId}"]`);
      if (newButton) {
        newButton.focus();
      }
    }
  }
  
  /**
   * Show loading indicator
   * @private
   */
  _showLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'flex';
      this.contentContainer.classList.add('loading');
    }
  }
  
  /**
   * Hide loading indicator
   * @private
   */
  _hideLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'none';
      this.contentContainer.classList.remove('loading');
    }
  }
  
  /**
   * Show error message
   * @private
   */
  _showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'viz-error';
    errorDiv.innerHTML = `
      <div class="viz-error-icon">⚠️</div>
      <div class="viz-error-message">${message}</div>
    `;
    
    // Clear content and show error
    const activeContainer = this.contentContainer.querySelector(`#viz-content-${this.activeTabId}`);
    if (activeContainer) {
      activeContainer.innerHTML = '';
      activeContainer.appendChild(errorDiv);
    }
  }
  
  /**
   * Load active tab from localStorage
   * @private
   */
  _loadActiveTabFromStorage() {
    try {
      return localStorage.getItem(this.options.storageKey);
    } catch (error) {
      console.warn('Failed to load active tab from localStorage:', error);
      return null;
    }
  }
  
  /**
   * Save active tab to localStorage
   * @private
   */
  _saveActiveTabToStorage(tabId) {
    try {
      localStorage.setItem(this.options.storageKey, tabId);
    } catch (error) {
      console.warn('Failed to save active tab to localStorage:', error);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedVisualizationPanel;
}
