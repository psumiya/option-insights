/**
 * Theme-aware color utility
 * Provides colors that adapt to the current theme
 */

const ThemeColors = {
  /**
   * Get current theme from document
   */
  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  },

  /**
   * Get theme-aware colors
   */
  get() {
    const isDark = this.getCurrentTheme() === 'dark';
    
    return {
      // Background colors
      background: isDark ? '#0a0e27' : '#f8fafc',
      surface: isDark ? '#141b2d' : '#ffffff',
      border: isDark ? '#1f2937' : '#e2e8f0',
      
      // Text colors
      textPrimary: isDark ? '#e5e7eb' : '#1e293b',
      textSecondary: isDark ? '#9ca3af' : '#64748b',
      
      // Semantic colors
      profit: isDark ? '#10b981' : '#059669',
      loss: isDark ? '#ef4444' : '#dc2626',
      accent: isDark ? '#3b82f6' : '#2563eb',
      warning: isDark ? '#f59e0b' : '#d97706',
      
      // Chart-specific colors
      gridLine: isDark ? '#1f2937' : '#e2e8f0',
      axisLine: isDark ? '#1f2937' : '#cbd5e1',
      zeroLine: isDark ? '#9ca3af' : '#64748b',
      
      // Tooltip
      tooltipBg: isDark ? '#141b2d' : '#ffffff',
      tooltipBorder: isDark ? '#1f2937' : '#cbd5e1',
      
      // Horizon chart bands
      positiveBands: isDark 
        ? ['#86efac', '#4ade80', '#22c55e', '#16a34a']
        : ['#6ee7b7', '#34d399', '#10b981', '#059669'],
      negativeBands: isDark
        ? ['#fca5a5', '#f87171', '#ef4444', '#dc2626']
        : ['#fca5a5', '#f87171', '#ef4444', '#b91c1c']
    };
  },

  /**
   * Get CSS variable value
   */
  getCSSVar(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  },

  /**
   * Listen for theme changes and call callback
   */
  onChange(callback) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          callback(this.get());
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return observer;
  },

  /**
   * Register a chart for automatic theme updates
   * Chart must have an update() method
   */
  registerChart(chart) {
    if (!chart || typeof chart.update !== 'function') {
      console.warn('Chart must have an update() method to register for theme changes');
      return null;
    }

    return this.onChange(() => {
      // Re-render chart with current data when theme changes
      if (chart.currentData) {
        chart.update(chart.currentData);
      }
    });
  }
};
