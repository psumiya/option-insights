/**
 * Theme Manager
 * Handles light/dark mode toggle with system preference sync
 */

class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'theme-preference';
        this.currentTheme = this.getStoredTheme() || 'dark'; // Default to dark if system not available
        this.systemPreference = this.getSystemPreference();
        
        // If no stored theme, use system preference
        if (!this.getStoredTheme()) {
            this.currentTheme = this.systemPreference;
        }
        
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
        
        // Update document attribute
        document.documentElement.setAttribute('data-theme', theme);
        
        // Store preference
        this.setStoredTheme(theme);
        
        // Update UI icon
        this.updateUI();
    }
    
    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }
    
    /**
     * Initialize UI event listeners
     */
    initializeUI() {
        const toggleBtn = document.getElementById('theme-toggle-btn');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // Initial UI update
        this.updateUI();
    }
    
    /**
     * Update UI icon to reflect current theme
     */
    updateUI() {
        const themeIcon = document.getElementById('theme-icon');
        
        if (!themeIcon) return;
        
        // Update icon based on current theme
        if (this.currentTheme === 'dark') {
            // Show moon icon (dark mode active)
            themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
        } else {
            // Show sun icon (light mode active)
            themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
        }
    }
}

// Initialize theme manager immediately
const themeManager = new ThemeManager();
