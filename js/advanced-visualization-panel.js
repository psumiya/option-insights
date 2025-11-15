/**
 * AdvancedVisualizationPanel - Manages vertical scrolling panels for advanced visualizations
 * 
 * This component provides a vertical layout where all visualizations are displayed
 * in individual panels that can be scrolled through. Each visualization is rendered
 * in its own section with a title.
 */
class AdvancedVisualizationPanel {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    
    this.options = {
      showLoadingIndicator: options.showLoadingIndicator !== false,
      loadingThreshold: options.loadingThreshold || 100,
      ...options
    };
    
    this.visualizations = new Map(); // Map<vizId, { label, icon, component }>
    this.currentData = null;
    
    // DOM elements
    this.panelsContainer = null;
  }
  
  /**
   * Initialize the panel with vertical scrolling layout
   */
  initialize() {
    // Clear existing content
    this.container.innerHTML = '';
    
    // Create main panel structure
    this.container.className = 'advanced-viz-panel-vertical';
    
    // Create panels container
    this.panelsContainer = document.createElement('div');
    this.panelsContainer.className = 'viz-panels-container';
    this.container.appendChild(this.panelsContainer);
    
    return this;
  }
  
  /**
   * Register a visualization component with a panel
   * @param {string} vizId - Unique identifier for the visualization
   * @param {string} vizLabel - Display label for the visualization
   * @param {Object} visualizationComponent - Visualization component instance
   * @param {Object} options - Additional options (icon, etc.)
   */
  registerVisualization(vizId, vizLabel, visualizationComponent, options = {}) {
    if (this.visualizations.has(vizId)) {
      console.warn(`Visualization with id "${vizId}" already registered. Overwriting.`);
    }
    
    this.visualizations.set(vizId, {
      label: vizLabel,
      icon: options.icon || '',
      component: visualizationComponent
    });
    
    // Render the panel
    this._renderPanel(vizId);
    
    return this;
  }
  

  
  /**
   * Update all visualizations with new data
   * @param {*} data - Data to pass to the visualizations
   * @param {Object} options - Additional options to pass to the visualizations
   */
  update(data, options = {}) {
    this.currentData = data;
    
    // Update all registered visualizations
    this.visualizations.forEach((viz, vizId) => {
      if (!viz.component) {
        return;
      }
      
      try {
        // Use requestAnimationFrame to ensure smooth rendering
        requestAnimationFrame(() => {
          if (viz.component && typeof viz.component.update === 'function') {
            viz.component.update(data, options);
          }
        });
      } catch (error) {
        console.error(`Error updating visualization "${vizId}":`, error);
        this._showError(vizId, error.message);
      }
    });
    
    return this;
  }
  

  
  /**
   * Destroy the panel and all visualizations
   */
  destroy() {
    // Destroy all visualization components
    this.visualizations.forEach((viz) => {
      if (viz.component && typeof viz.component.destroy === 'function') {
        viz.component.destroy();
      }
    });
    
    // Clear data structures
    this.visualizations.clear();
    this.currentData = null;
    
    // Clear DOM
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    return this;
  }
  
  // Private methods
  
  /**
   * Render a visualization panel
   * @private
   */
  _renderPanel(vizId) {
    const viz = this.visualizations.get(vizId);
    if (!viz) return;
    
    // Create panel section
    const panel = document.createElement('section');
    panel.className = 'viz-panel';
    panel.id = `viz-panel-${vizId}`;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', viz.label);
    
    // Create panel header
    const header = document.createElement('div');
    header.className = 'viz-panel-header';
    
    const title = document.createElement('h2');
    title.className = 'viz-panel-title';
    title.textContent = viz.label;
    header.appendChild(title);
    
    panel.appendChild(header);
    
    // Create visualization container
    const vizContainer = document.createElement('div');
    vizContainer.id = `viz-content-${vizId}`;
    vizContainer.className = 'viz-panel-content';
    panel.appendChild(vizContainer);
    
    // Append panel to container
    this.panelsContainer.appendChild(panel);
    
    // Initialize the visualization component with the container
    if (viz.component && typeof viz.component.initialize === 'function') {
      viz.component.initialize(vizContainer);
    }
  }
  
  /**
   * Show error message in a specific panel
   * @private
   */
  _showError(vizId, message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'viz-error';
    errorDiv.innerHTML = `
      <div class="viz-error-icon">⚠️</div>
      <div class="viz-error-message">${message}</div>
    `;
    
    // Clear content and show error
    const vizContainer = document.getElementById(`viz-content-${vizId}`);
    if (vizContainer) {
      vizContainer.innerHTML = '';
      vizContainer.appendChild(errorDiv);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedVisualizationPanel;
}
