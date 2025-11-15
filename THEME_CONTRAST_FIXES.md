# Theme Contrast Fixes - Summary

## Issues Fixed

### 1. CSS Contrast Issues ✅ FIXED
- **Primary buttons**: Changed from `var(--color-text-primary)` to `#ffffff` for consistent white text on blue background
- **Select dropdown arrows**: Now theme-aware with different colors for light/dark modes
- **Table row hovers**: Fixed white-on-white issue by using theme-specific overlays
- **Collapsible headers**: Fixed hover states for both themes
- **Button active states**: Removed problematic white overlay

### 2. Theme Infrastructure ✅ ADDED
- Created `js/theme-colors.js` utility for theme-aware colors
- Added CSS variables for SVG chart colors (`--svg-text-primary`, `--svg-background`, etc.)
- Added automatic chart tooltip theming via CSS

## Remaining Work: Visualization Files

The following visualization files have hardcoded dark theme colors that need updating:

### Files to Update:
1. `js/visualizations/pl-trend-chart.js`
2. `js/visualizations/top-underlyings-chart.js`
3. `js/visualizations/strategy-performance-chart.js`
4. `js/visualizations/horizon-chart.js`
5. Other visualization files in `js/visualizations/`

### How to Update Visualization Files:

#### Step 1: Store current data
Add to constructor:
```javascript
this.currentData = null;
```

Add to update() method:
```javascript
update(data) {
  this.currentData = data; // Store for theme changes
  // ... rest of update code
}
```

#### Step 2: Replace hardcoded colors
Replace these hardcoded values with `ThemeColors.get()`:

**Before:**
```javascript
.style('background-color', '#141b2d')
.style('border', '1px solid #1f2937')
.attr('fill', '#e5e7eb')
.attr('stroke', '#1f2937')
```

**After:**
```javascript
const colors = ThemeColors.get();
.style('background-color', colors.tooltipBg)
.style('border', `1px solid ${colors.tooltipBorder}`)
.attr('fill', colors.textPrimary)
.attr('stroke', colors.axisLine)
```

#### Step 3: Register for theme changes
Add to constructor:
```javascript
// Register for theme changes
ThemeColors.registerChart(this);
```

### Color Mapping Reference:

| Old Hardcoded Value | New ThemeColors Property |
|---------------------|-------------------------|
| `#141b2d` (tooltip bg) | `colors.tooltipBg` |
| `#1f2937` (borders/grid) | `colors.gridLine` or `colors.axisLine` |
| `#e5e7eb` (primary text) | `colors.textPrimary` |
| `#9ca3af` (secondary text) | `colors.textSecondary` |
| `#10b981` (profit) | `colors.profit` |
| `#ef4444` (loss) | `colors.loss` |
| `#3b82f6` (accent) | `colors.accent` |

## Testing

To test the fixes:
1. Open `test-theme-toggle.html` or `index.html`
2. Click through Light → System → Dark modes
3. Verify:
   - No white-on-white text
   - No black-on-black text
   - All text is readable
   - Charts update colors (once visualization files are updated)

## Current Status

✅ **Fixed:**
- CSS contrast issues
- Button colors
- Table styles
- Form controls
- Theme toggle UI
- Tooltip base styles

⚠️ **Needs Update:**
- Individual visualization chart files (hardcoded colors in D3.js code)

The infrastructure is in place. Each visualization file just needs to:
1. Use `ThemeColors.get()` instead of hardcoded colors
2. Store `currentData` for re-rendering
3. Register with `ThemeColors.registerChart(this)`
