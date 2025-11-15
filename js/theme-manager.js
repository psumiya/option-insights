/**
 * Theme Manager
 * Handles light/dark mode toggle with system preference sync
 */

class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'theme-preference';
        this.currentTheme = this.getStoredTheme() || 'system';
        this.systemPreference = this.getSystemPreference();
        
        // Initialize theme on load
        this.applyTheme(this.currentTheme);
        
        // Listen for system preference changes
        this.watchSystemPreference();
        
        // Initialize UI after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeUI());
        } else {
            this.initializeUI();
        }
    }
    
    /**
     * Get stored theme preference from localStorage
     */
    getStoredTheme() {
        try {
            return localStorage.getItem(this.STORAGE_KEY);
        } catch (e) {
            console.warn('localStorage not available:', e);
            return null;
        }
    }
    
    /**
     * Store theme preference in localStorage
     */
    setStoredTheme(theme) {
        try {
            localStorage.setItem(this.STORAGE_KEY, theme);
        } catch (e) {
            console.warn('localStorage not available:', e);
        }
    }
    
    /**
     * Get system color scheme preference
     */
    getSystemPreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }
    
    /**
     * Watch for system preference changes
     */
    watchSystemPreference() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Modern browsers
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', (e) => {
                    this.systemPreference = e.matches ? 'dark' : 'light';
                    if (this.currentTheme === 'system') {
                        this.applyTheme('system');
                    }
                });
            }
            // Older browsers
            else if (mediaQuery.addListener) {
                mediaQuery.addListener((e) => {
                    this.systemPreference = e.matches ? 'dark' : 'light';
                    if (this.currentTheme === 'system') {
                        this.applyTheme('system');
                    }
                });
            }
        }
    }
    
    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        this.currentTheme = theme;
        
        // Determine actual theme to apply
        const effectiveTheme = theme === 'system' ? this.systemPreference : theme;
        
        // Update document attribute
        document.documentElement.setAttribute('data-theme', effectiveTheme);
        
        // Store preference
        this.setStoredTheme(theme);
        
        // Update UI buttons
        this.updateUI();
    }
    
    /**
     * Initialize UI event listeners
     */
    initializeUI() {
        const buttons = document.querySelectorAll('.theme-btn');
        
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const theme = button.getAttribute('data-theme');
                this.applyTheme(theme);
            });
        });
        
        // Initial UI update
        this.updateUI();
    }
    
    /**
     * Update UI to reflect current theme
     */
    updateUI() {
        const buttons = document.querySelectorAll('.theme-btn');
        
        buttons.forEach(button => {
            const theme = button.getAttribute('data-theme');
            const isActive = theme === this.currentTheme;
            
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-checked', isActive.toString());
        });
    }
}

// Initialize theme manager immediately
const themeManager = new ThemeManager();
