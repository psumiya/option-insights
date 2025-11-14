# Design Document

## Overview

This feature adds advanced D3.js visualizations to the options trading analytics dashboard through a tabbed panel interface, allowing users to explore their trading data from multiple analytical perspectives. The design follows the existing architecture pattern of modular visualization components managed by the DashboardController, with new UI patterns for tab navigation and collapsible sections.

The implementation prioritizes:
- **User Choice**: All 8 visualization types available without forcing a single view
- **Clean Presentation**: Tabbed interface keeps the UI uncluttered
- **Performance**: Lazy rendering of visualizations (only active tab renders)
- **Consistency**: Follows existing component patterns and styling
- **Responsiveness**: Works on mobile and desktop devices

## Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    DashboardController                       │
│  - Manages all visualization components                     │
│  - Handles filter changes and data updates                  │
│  - Coordinates tab switching and collapsible sections       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─── Existing Components
                              │    ├─ SummaryMetricsPanel
                              │    ├─ PLTrendChart
                              │    ├─ WinRateChart
                              │    ├─ PLBreakdownChart
                              │    ├─ SymbolPLChart
                              │    ├─ WinLossDonutChart
                              │    └─ TopUnderlyingsChart
                              │
                              └─── New Components
                                   ├─ AdvancedVisualizationPanel (Tab Manager)
                                   ├─ HeatmapCalendarChart
                                   ├─ ScatterPlotChart
                                   ├─ ViolinPlotChart
                                   ├─ SankeyDiagramChart
                                   ├─ BubbleChart
                                   ├─ RadialChart
                                   ├─ WaterfallChart
                                   ├─ HorizonChart
                                   └─ CollapsibleSection (UI Component)
```

### Data Flow

```
User Action (Filter/Tab Change)
        ↓
DashboardController.handleFilterChange() / handleTabChange()
        ↓
AnalyticsEngine.calculate*() methods
        ↓
Active Visualization Component.update(data)
        ↓
D3.js Rendering
```

## Components and Interfaces

### 1. AdvancedVisualizationPanel (New)

**Purpose**: Manages the tabbed interface for advanced visualizations

**Interface**:
```javascript
class AdvancedVisualizationPanel {
  constructor(containerId, options = {})
  
  // Initialize panel with tabs and container
  initialize()
  
  // Register a visualization component with a tab
  registerVisualization(tabId, tabLabel, visualizationComponent)
  
  // Switch to a specific tab
  switchTab(tabId)
  
  // Update the active visualization with new data
  update(data)
  
  // Get the currently active tab ID
  getActiveTab()
  
  // Destroy panel and all visualizations
  destroy()
}
```

**Responsibilities**:
- Render tab navigation UI
- Manage tab state (active/inactive)
- Lazy-load and render only the active visualization
- Handle tab click events
- Coordinate with DashboardController for data updates
- Persist selected tab to localStorage

**Tab Configuration**:
```javascript
const tabs = [
  { id: 'heatmap', label: 'Calendar Heatmap', icon: '📅' },
  { id: 'scatter', label: 'Days Held vs P/L', icon: '📊' },
  { id: 'violin', label: 'P/L Distribution', icon: '🎻' },
  { id: 'sankey', label: 'Trade Flow', icon: '🌊' },
  { id: 'bubble', label: 'Win Rate Analysis', icon: '⚪' },
  { id: 'radial', label: 'Monthly Performance', icon: '⭕' },
  { id: 'waterfall', label: 'P/L Attribution', icon: '📉' },
  { id: 'horizon', label: 'Long-term Trends', icon: '📈' }
];
```

### 2. CollapsibleSection (New)

**Purpose**: Reusable UI component for collapsible content sections

**Interface**:
```javascript
class CollapsibleSection {
  constructor(containerId, options = {})
  
  // Initialize collapsible section
  initialize()
  
  // Expand the section
  expand()
  
  // Collapse the section
  collapse()
  
  // Toggle between expanded/collapsed
  toggle()
  
  // Check if section is expanded
  isExpanded()
  
  // Update the content
  updateContent(content)
  
  // Destroy section
  destroy()
}
```

**Options**:
```javascript
{
  title: 'Section Title',
  defaultExpanded: false,
  animationDuration: 300,
  showSummary: true,
  summaryText: '25 rows available',
  persistState: true,
  storageKey: 'section_state_key'
}
```

### 3. Visualization Components (New)

Each visualization component follows the same interface pattern as existing charts:

```javascript
class [VisualizationName]Chart {
  constructor(containerId, data = [], options = {})
  
  // Update chart with new data
  update(data, options = {})
  
  // Resize chart to fit container
  resize()
  
  // Destroy chart and clean up resources
  destroy()
  
  // Private methods
  _initChart()
  _setupResizeObserver()
  _render()
  _showTooltip(event, data)
  _hideTooltip()
  _showEmptyState()
}
```

## Data Models

### Heatmap Calendar Data
```javascript
{
  date: Date,           // Trading day
  pl: Number,          // P/L for that day
  tradeCount: Number   // Number of trades closed that day
}
```

### Scatter Plot Data
```javascript
{
  symbol: String,
  strategy: String,
  daysHeld: Number,
  pl: Number,
  type: String         // 'Call' or 'Put'
}
```

### Violin Plot Data
```javascript
{
  strategy: String,
  plValues: [Number],  // Array of all P/L values for distribution
  median: Number,
  mean: Number,
  q1: Number,          // First quartile
  q3: Number,          // Third quartile
  min: Number,
  max: Number,
  stdDev: Number
}
```

### Sankey Diagram Data
```javascript
{
  nodes: [
    { id: String, name: String, layer: Number }  // layer: 0=Symbol, 1=Strategy, 2=Result
  ],
  links: [
    { source: String, target: String, value: Number, result: String }
  ]
}
```

### Bubble Chart Data
```javascript
{
  strategy: String,
  winRate: Number,      // Percentage
  averageWin: Number,   // Dollar amount
  tradeCount: Number,   // For bubble size
  netPL: Number        // For color coding
}
```

### Radial Chart Data
```javascript
{
  month: String,        // 'Jan 2024'
  strategies: [
    { strategy: String, pl: Number }
  ]
}
```

### Waterfall Chart Data
```javascript
{
  symbol: String,
  pl: Number,
  cumulativePL: Number  // Running total
}
```

### Horizon Chart Data
```javascript
{
  date: Date,
  cumulativePL: Number
}
```

## UI Layout Changes

### Current Layout (Simplified)
```
┌─────────────────────────────────────────┐
│ Summary Metrics                         │
├─────────────────────────────────────────┤
│ P/L Trend Chart                         │
├──────────────────┬──────────────────────┤
│ Win Rate Chart   │ P/L by Strategy      │
├──────────────────┼──────────────────────┤
│ Win/Loss Donut   │ Top Underlyings      │
├─────────────────────────────────────────┤
│ P/L by Symbol                           │
├─────────────────────────────────────────┤
│ P/L by Symbol & Strategy Table          │
└─────────────────────────────────────────┘
```

### New Layout
```
┌─────────────────────────────────────────┐
│ Summary Metrics                         │
├─────────────────────────────────────────┤
│ P/L Trend Chart                         │
├──────────────────┬──────────────────────┤
│ Win Rate Chart   │ P/L by Strategy      │
├──────────────────┼──────────────────────┤
│ Win/Loss Donut   │ Top Underlyings      │
├─────────────────────────────────────────┤
│ P/L by Symbol                           │
├─────────────────────────────────────────┤
│ ┌─ Advanced Analytics ─────────────┐   │
│ │ [📅 Calendar] [📊 Scatter] ...   │   │  ← Tab Navigation
│ ├──────────────────────────────────┤   │
│ │                                  │   │
│ │   Active Visualization Content   │   │  ← Chart Area
│ │                                  │   │
│ └──────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ ▶ P/L by Symbol & Strategy (25 rows)   │  ← Collapsed by default
└─────────────────────────────────────────┘
```

## Styling and Visual Design

### Tab Navigation Styles

```css
.advanced-viz-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0;
  overflow: hidden;
}

.viz-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  background: var(--color-background);
  border-bottom: 2px solid var(--color-border);
  padding: 8px;
}

.viz-tab {
  flex: 1 1 auto;
  min-width: 140px;
  padding: 10px 16px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.viz-tab:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.viz-tab.active {
  background: var(--color-surface);
  border-color: var(--color-accent);
  color: var(--color-text-primary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.viz-tab-icon {
  font-size: 16px;
}

.viz-content {
  padding: 24px;
  min-height: 400px;
}

.viz-content.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Mobile responsive tabs */
@media (max-width: 767px) {
  .viz-tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
  }
  
  .viz-tab {
    flex-shrink: 0;
    min-width: 120px;
  }
}
```

### Collapsible Section Styles

```css
.collapsible-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.collapsible-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
}

.collapsible-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.collapsible-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
}

.collapsible-summary {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.collapsible-icon {
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
  color: var(--color-text-secondary);
}

.collapsible-icon.expanded {
  transform: rotate(90deg);
}

.collapsible-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.collapsible-content.expanded {
  max-height: 5000px; /* Large enough for content */
}

.collapsible-inner {
  padding: 0 20px 20px 20px;
}
```

### Export Button Styles

```css
.viz-export-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 8px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  z-index: 10;
}

.viz-export-btn:hover {
  background: var(--color-background);
  color: var(--color-text-primary);
  border-color: var(--color-accent);
}

.viz-export-btn svg {
  width: 14px;
  height: 14px;
}
```

## Visualization-Specific Design Details

### 1. Heatmap Calendar

**Visual Design**:
- Calendar grid layout with weeks as rows
- Month labels above each month's columns
- Color scale: Red (#ef4444) → White (#e5e7eb) → Green (#10b981)
- Empty days shown as light gray (#1f2937)
- Cell size: 14px × 14px with 2px gap
- Tooltip shows: Date, P/L, Trade count

**D3 Techniques**:
- `d3.scaleSequential()` for color interpolation
- `d3.timeWeek()` for week grouping
- `d3.timeFormat()` for date labels

### 2. Scatter Plot

**Visual Design**:
- X-axis: Days Held (0-60+ days)
- Y-axis: P/L ($)
- Point size: 6px radius
- Color by strategy (use existing color scale)
- Zero line: Dashed horizontal at Y=0
- Legend: Top-right corner

**D3 Techniques**:
- `d3.scaleLinear()` for both axes
- `d3.scaleOrdinal()` for strategy colors
- Zoom/pan capability with `d3.zoom()`

### 3. Violin Plot

**Visual Design**:
- Violin width represents probability density
- Box plot overlay: Median (line), Q1/Q3 (box), whiskers
- Color: Semi-transparent blue (#3b82f6 at 0.3 opacity)
- Width: 80px per violin
- Tooltip shows: Strategy, Median, Mean, Std Dev

**D3 Techniques**:
- `d3.contourDensity()` for density estimation
- `d3.area()` for violin shape
- `d3.quantile()` for quartile calculations

### 4. Sankey Diagram

**Visual Design**:
- Three columns: Symbol | Strategy | Result
- Flow width proportional to absolute P/L
- Flow color: Green for wins, Red for losses
- Node labels inside rectangles
- Minimum flow width: 2px

**D3 Techniques**:
- `d3.sankey()` layout
- `d3.sankeyLinkHorizontal()` for paths
- Gradient fills for flows

### 5. Bubble Chart

**Visual Design**:
- X-axis: Win Rate (0-100%)
- Y-axis: Average Win ($)
- Bubble size: Trade count (min 10px, max 60px radius)
- Bubble color: Gradient from red (negative net P/L) to green (positive)
- Reference lines at 50% win rate and $0 average win
- Quadrant labels: "High Quality", "Volume Play", etc.

**D3 Techniques**:
- `d3.scaleLinear()` for axes
- `d3.scaleSqrt()` for bubble sizing
- `d3.scaleSequential()` for color gradient

### 6. Radial Chart

**Visual Design**:
- 12 months arranged clockwise (Jan at top)
- Each strategy as a colored area layer
- Radius represents P/L magnitude
- Center point at $0
- Legend outside the circle

**D3 Techniques**:
- `d3.scaleLinear()` for radial scale
- `d3.lineRadial()` for area paths
- `d3.scaleOrdinal()` for strategy colors

### 7. Waterfall Chart

**Visual Design**:
- Bars for top 15 symbols by absolute P/L
- Green bars for positive contributions
- Red bars for negative contributions
- Connector lines between bars
- Final "Total" bar in accent color
- Bar width: 40px with 10px gap

**D3 Techniques**:
- `d3.scaleBand()` for X-axis
- `d3.scaleLinear()` for Y-axis
- Cumulative calculation for positioning

### 8. Horizon Chart

**Visual Design**:
- Compressed vertical space (60px height)
- 4 color bands for magnitude ranges
- Positive values: Light green → Dark green
- Negative values: Light red → Dark red
- Baseline at center
- Full width time series

**D3 Techniques**:
- `d3.scaleTime()` for X-axis
- `d3.scaleThreshold()` for color bands
- `d3.area()` for layered areas
- Clipping paths for band separation

## Error Handling

### Empty State Handling

Each visualization component will display an appropriate empty state when:
- No data available after filtering
- Insufficient data for the visualization type (e.g., < 2 data points for scatter plot)

Empty state message format:
```
No [visualization name] data available
[Helpful message about what's needed]
```

### Data Validation

Before rendering, each component validates:
1. Data array is not null/undefined
2. Data array has minimum required length
3. Required fields exist in data objects
4. Numeric values are valid numbers (not NaN)

### Graceful Degradation

If a visualization fails to render:
1. Log error to console with details
2. Display error message in visualization area
3. Don't crash other visualizations
4. Provide "Retry" button if applicable

## Testing Strategy

### Unit Testing Focus

1. **AdvancedVisualizationPanel**
   - Tab switching logic
   - State persistence
   - Lazy loading behavior

2. **CollapsibleSection**
   - Expand/collapse animations
   - State persistence
   - Content updates

3. **Each Visualization Component**
   - Data transformation correctness
   - Empty state handling
   - Tooltip content accuracy

### Integration Testing

1. Filter changes update active visualization
2. Tab switching maintains filter state
3. Collapsible section state persists across page reloads
4. Export functionality generates correct images

### Visual Regression Testing

1. Screenshot comparison for each visualization type
2. Responsive layout at different breakpoints
3. Color accuracy for P/L coding

### Performance Testing

1. Rendering time for large datasets (1000+ trades)
2. Tab switching responsiveness
3. Memory usage with multiple visualizations
4. Export image generation time

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)
- Create AdvancedVisualizationPanel component
- Create CollapsibleSection component
- Update DashboardController to manage new components
- Add tab navigation UI and styling
- Implement collapsible table section

### Phase 2: Basic Visualizations
- Heatmap Calendar (most requested)
- Scatter Plot (high value, moderate complexity)
- Bubble Chart (high value, moderate complexity)

### Phase 3: Advanced Visualizations
- Violin Plot (complex, high value for advanced users)
- Waterfall Chart (moderate complexity)
- Radial Chart (moderate complexity)

### Phase 4: Complex Visualizations
- Sankey Diagram (most complex)
- Horizon Chart (complex, niche use case)

### Phase 5: Polish
- Export functionality
- Performance optimization
- Accessibility improvements
- Mobile responsiveness refinement

## Accessibility Considerations

1. **Keyboard Navigation**
   - Tab key navigates through tabs
   - Enter/Space activates tabs
   - Arrow keys move between tabs

2. **Screen Reader Support**
   - ARIA labels for all interactive elements
   - ARIA live regions for dynamic content updates
   - Descriptive alt text for exported images

3. **Color Contrast**
   - All text meets WCAG AA standards (4.5:1 ratio)
   - Don't rely solely on color for information
   - Provide patterns/textures as alternatives

4. **Focus Indicators**
   - Visible focus outlines on all interactive elements
   - High contrast focus indicators

## Performance Optimization

1. **Lazy Rendering**
   - Only render active tab visualization
   - Destroy inactive visualizations to free memory

2. **Data Sampling**
   - For scatter plots with >500 points, consider sampling
   - Aggregate data for horizon charts with >365 days

3. **Debouncing**
   - Debounce filter changes (300ms)
   - Debounce resize events (150ms)

4. **Memoization**
   - Cache calculated analytics data
   - Invalidate cache on filter changes

5. **Virtual Scrolling**
   - For collapsible table with >100 rows
   - Render only visible rows + buffer

## Browser Compatibility

Target browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari 14+
- Chrome Android 90+

Required polyfills:
- None (D3.js v7 handles compatibility)

## Future Enhancements

1. **Custom Date Range Picker**
   - Allow users to select arbitrary date ranges
   - Quick presets (Last 7 days, Last 30 days, etc.)

2. **Visualization Customization**
   - User-configurable color schemes
   - Adjustable chart dimensions
   - Toggle data labels on/off

3. **Comparison Mode**
   - Compare two time periods side-by-side
   - Highlight differences

4. **Annotations**
   - Allow users to add notes to specific dates/trades
   - Display annotations on visualizations

5. **Dashboard Layouts**
   - Save custom dashboard layouts
   - Drag-and-drop to rearrange panels

6. **Data Export**
   - Export filtered data as CSV
   - Export all visualizations as PDF report
