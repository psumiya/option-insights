/**
 * CollapsibleSection UI Component
 * Reusable component for collapsible content sections with smooth animations
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
class CollapsibleSection {
  /**
   * Create a collapsible section
   * @param {string} containerId - DOM element ID where the section will be rendered
   * @param {Object} options - Configuration options
   * @param {string} options.title - Section title text
   * @param {boolean} options.defaultExpanded - Initial expanded state (default: false)
   * @param {number} options.animationDuration - Animation duration in milliseconds (default: 300)
   * @param {boolean} options.showSummary - Whether to show summary text when collapsed (default: true)
   * @param {string} options.summaryText - Summary text to display when collapsed
   * @param {boolean} options.persistState - Whether to persist state to localStorage (default: true)
   * @param {string} options.storageKey - localStorage key for state persistence
   */
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }

    // Configuration
    this.options = {
      title: options.title || 'Section',
      defaultExpanded: options.defaultExpanded !== undefined ? options.defaultExpanded : false,
      animationDuration: options.animationDuration || 300,
      showSummary: options.showSummary !== undefined ? options.showSummary : true,
      summaryText: options.summaryText || '',
      persistState: options.persistState !== undefined ? options.persistState : true,
      storageKey: options.storageKey || `collapsible_${containerId}`
    };

    // State
    this.expanded = this.options.defaultExpanded;
    this.contentElement = null;
    this.innerElement = null;
    this.iconElement = null;
    this.summaryElement = null;

    // Load persisted state if enabled (Requirement 1.3)
    if (this.options.persistState) {
      this.loadState();
    }
  }

  /**
   * Initialize the collapsible section
   * Requirements: 1.1, 1.2, 1.4
   */
  initialize() {
    if (!this.container) return;

    // Store original content
    const originalContent = this.container.innerHTML;

    // Create collapsible structure
    this.container.innerHTML = `
      <div class="collapsible-section">
        <div class="collapsible-header" role="button" tabindex="0" aria-expanded="${this.expanded}">
          <div class="collapsible-title">
            <svg class="collapsible-icon ${this.expanded ? 'expanded' : ''}" 
                 width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 6L12 10L7 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${this.options.title}</span>
          </div>
          <div class="collapsible-summary ${this.expanded ? 'hidden' : ''}">
            ${this.options.showSummary ? this.options.summaryText : ''}
          </div>
        </div>
        <div class="collapsible-content ${this.expanded ? 'expanded' : ''}" 
             style="max-height: ${this.expanded ? 'none' : '0'}; transition: max-height ${this.options.animationDuration}ms ease;">
          <div class="collapsible-inner">
            ${originalContent}
          </div>
        </div>
      </div>
    `;

    // Get references to elements
    const header = this.container.querySelector('.collapsible-header');
    this.contentElement = this.container.querySelector('.collapsible-content');
    this.innerElement = this.container.querySelector('.collapsible-inner');
    this.iconElement = this.container.querySelector('.collapsible-icon');
    this.summaryElement = this.container.querySelector('.collapsible-summary');

    // Set initial state
    if (this.expanded) {
      this.contentElement.style.maxHeight = 'none';
    }

    // Add event listeners
    header.addEventListener('click', () => this.toggle());
    header.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * Expand the section (Requirement 1.2)
   */
  expand() {
    if (!this.contentElement || this.expanded) return;

    this.expanded = true;

    // Update ARIA attribute
    const header = this.container.querySelector('.collapsible-header');
    if (header) {
      header.setAttribute('aria-expanded', 'true');
    }

    // Rotate icon
    if (this.iconElement) {
      this.iconElement.classList.add('expanded');
    }

    // Hide summary text (Requirement 1.5)
    if (this.summaryElement) {
      this.summaryElement.classList.add('hidden');
    }

    // Calculate target height
    const targetHeight = this.innerElement.scrollHeight;

    // Animate expansion (Requirement 1.4)
    this.contentElement.style.maxHeight = `${targetHeight}px`;
    this.contentElement.classList.add('expanded');

    // After animation completes, set to 'none' for dynamic content
    setTimeout(() => {
      if (this.expanded) {
        this.contentElement.style.maxHeight = 'none';
      }
    }, this.options.animationDuration);

    // Persist state (Requirement 1.3)
    if (this.options.persistState) {
      this.saveState();
    }
  }

  /**
   * Collapse the section (Requirement 1.2)
   */
  collapse() {
    if (!this.contentElement || !this.expanded) return;

    this.expanded = false;

    // Update ARIA attribute
    const header = this.container.querySelector('.collapsible-header');
    if (header) {
      header.setAttribute('aria-expanded', 'false');
    }

    // Rotate icon back
    if (this.iconElement) {
      this.iconElement.classList.remove('expanded');
    }

    // Show summary text (Requirement 1.5)
    if (this.summaryElement && this.options.showSummary) {
      this.summaryElement.classList.remove('hidden');
    }

    // Set current height before animating
    const currentHeight = this.innerElement.scrollHeight;
    this.contentElement.style.maxHeight = `${currentHeight}px`;

    // Force reflow
    this.contentElement.offsetHeight;

    // Animate collapse (Requirement 1.4)
    this.contentElement.style.maxHeight = '0';
    this.contentElement.classList.remove('expanded');

    // Persist state (Requirement 1.3)
    if (this.options.persistState) {
      this.saveState();
    }
  }

  /**
   * Toggle between expanded and collapsed states (Requirement 1.2)
   */
  toggle() {
    if (this.expanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  /**
   * Check if section is expanded
   * @returns {boolean} True if expanded, false if collapsed
   */
  isExpanded() {
    return this.expanded;
  }

  /**
   * Update the content inside the collapsible section
   * @param {string|HTMLElement} content - New content (HTML string or DOM element)
   */
  updateContent(content) {
    if (!this.innerElement) return;

    if (typeof content === 'string') {
      this.innerElement.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.innerElement.innerHTML = '';
      this.innerElement.appendChild(content);
    }

    // Recalculate height if expanded
    if (this.expanded) {
      this.contentElement.style.maxHeight = 'none';
    }
  }

  /**
   * Update the summary text
   * @param {string} summaryText - New summary text
   */
  updateSummary(summaryText) {
    this.options.summaryText = summaryText;
    if (this.summaryElement) {
      this.summaryElement.textContent = summaryText;
    }
  }

  /**
   * Save state to localStorage (Requirement 1.3)
   */
  saveState() {
    if (!this.options.persistState) return;

    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify({
        expanded: this.expanded
      }));
    } catch (error) {
      console.warn('Failed to save collapsible section state:', error);
    }
  }

  /**
   * Load state from localStorage (Requirement 1.3)
   */
  loadState() {
    if (!this.options.persistState) return;

    try {
      const savedState = localStorage.getItem(this.options.storageKey);
      if (savedState) {
        const state = JSON.parse(savedState);
        this.expanded = state.expanded !== undefined ? state.expanded : this.options.defaultExpanded;
      }
    } catch (error) {
      console.warn('Failed to load collapsible section state:', error);
    }
  }

  /**
   * Destroy the section and clean up
   */
  destroy() {
    if (this.container) {
      // Remove event listeners by replacing the element
      const header = this.container.querySelector('.collapsible-header');
      if (header) {
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
      }

      // Clear container
      this.container.innerHTML = '';
    }

    // Clear references
    this.contentElement = null;
    this.innerElement = null;
    this.iconElement = null;
    this.summaryElement = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CollapsibleSection;
}
