/**
 * Tab Manager
 * Handles tab navigation and panel switching
 */

class TabManager {
    constructor() {
        this.currentTab = 'overview';
        this.init();
    }

    init() {
        // Get all tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        // Add click event listeners
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.target.id.replace('tab-', '');
                this.switchTab(tabId);
            });
        });

        // Show the default tab
        this.switchTab('overview');
    }

    switchTab(tabId) {
        // Update current tab
        this.currentTab = tabId;

        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            const btnTabId = button.id.replace('tab-', '');
            if (btnTabId === tabId) {
                button.classList.add('active');
                button.setAttribute('aria-selected', 'true');
            } else {
                button.classList.remove('active');
                button.setAttribute('aria-selected', 'false');
            }
        });

        // Update tab panels
        const tabPanels = document.querySelectorAll('.tab-panel');
        tabPanels.forEach(panel => {
            const panelTabId = panel.id.replace('tab-panel-', '');
            if (panelTabId === tabId) {
                panel.classList.remove('hidden');
                
                // Trigger resize for charts in the newly visible panel
                // This ensures charts recalculate dimensions after becoming visible
                setTimeout(() => {
                    const charts = panel.querySelectorAll('.chart-container');
                    charts.forEach(chart => {
                        window.dispatchEvent(new Event('resize'));
                    });
                }, 50);
            } else {
                panel.classList.add('hidden');
            }
        });

        // Store the active tab in localStorage for persistence
        try {
            localStorage.setItem('activeTab', tabId);
        } catch (e) {
            // Ignore localStorage errors
        }
    }

    getCurrentTab() {
        return this.currentTab;
    }

    // Restore the last active tab from localStorage
    restoreLastTab() {
        try {
            const lastTab = localStorage.getItem('activeTab');
            if (lastTab) {
                this.switchTab(lastTab);
            }
        } catch (e) {
            // Ignore localStorage errors
        }
    }
}

// Initialize tab manager when DOM is ready
if (typeof window !== 'undefined') {
    window.TabManager = TabManager;
}
