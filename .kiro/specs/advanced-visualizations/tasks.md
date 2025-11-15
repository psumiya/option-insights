# Implementation Plan

- [x] 1. Create CollapsibleSection UI component
  - Write CollapsibleSection class with expand/collapse functionality
  - Implement smooth CSS transitions for height animation
  - Add state persistence to localStorage
  - Add summary text display when collapsed
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Integrate CollapsibleSection with existing table
  - Wrap the P/L by Symbol & Strategy table section in CollapsibleSection
  - Set default state to collapsed
  - Update DashboardController to initialize the collapsible section
  - Test expand/collapse behavior with large datasets
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Create AdvancedVisualizationPanel component
  - Write AdvancedVisualizationPanel class to manage tabbed interface
  - Implement tab registration system for visualizations
  - Add tab switching logic with fade transitions
  - Implement active tab state persistence to localStorage
  - Add loading indicator for tab content
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 4. Add advanced visualization panel to dashboard layout
  - Update index.html to add new section below Top Underlyings chart
  - Create container div with proper styling
  - Initialize AdvancedVisualizationPanel in DashboardController
  - Wire up filter change events to update active visualization
  - _Requirements: 2.1, 2.2, 2.6, 12.1, 12.2_

- [x] 5. Implement HeatmapCalendarChart visualization
- [x] 5.1 Create HeatmapCalendarChart class with base structure
  - Set up SVG container and margins
  - Initialize color scale (red-white-green diverging)
  - Add ResizeObserver for responsive behavior
  - _Requirements: 3.1, 3.2_

- [x] 5.2 Implement calendar grid layout and rendering
  - Calculate week-based grid positions for dates
  - Render day cells with appropriate colors based on P/L
  - Add month labels above columns
  - Handle empty days (no trades) with gray color
  - _Requirements: 3.2, 3.3, 3.5_

- [x] 5.3 Add interactivity and data updates
  - Implement tooltip showing date, P/L, and trade count
  - Add hover effects on day cells
  - Implement update() method to refresh with new data
  - Add empty state handling
  - _Requirements: 3.4, 3.6, 12.3_

- [x] 6. Implement ScatterPlotChart visualization
- [x] 6.1 Create ScatterPlotChart class with axes
  - Set up SVG container with margins
  - Create X-axis (Days Held) and Y-axis (P/L) scales
  - Render axes with labels
  - Add zero reference line
  - _Requirements: 4.1, 4.6_

- [x] 6.2 Render scatter points and legend
  - Plot each trade as a circle
  - Color-code points by strategy
  - Add legend for strategy colors
  - Implement point sizing (6px radius)
  - _Requirements: 4.2, 4.3, 4.5_

- [x] 6.3 Add interactivity
  - Implement tooltip showing Symbol, Strategy, Days Held, P/L
  - Add hover effects on points
  - Implement update() method
  - Add empty state handling
  - _Requirements: 4.4, 12.3_

- [x] 7. Implement BubbleChart visualization
- [x] 7.1 Create BubbleChart class with quadrant layout
  - Set up SVG container with margins
  - Create X-axis (Win Rate %) and Y-axis (Average Win $) scales
  - Add reference lines at 50% and $0
  - Add quadrant labels
  - _Requirements: 7.1, 7.6_

- [x] 7.2 Render bubbles with sizing and coloring
  - Plot each strategy as a bubble
  - Size bubbles by trade count (sqrt scale)
  - Color bubbles by net P/L (gradient scale)
  - _Requirements: 7.2, 7.3, 7.4_

- [x] 7.3 Add interactivity
  - Implement tooltip showing all metrics
  - Add hover effects on bubbles
  - Implement update() method
  - Add empty state handling
  - _Requirements: 7.5, 12.3_

- [x] 8. Implement ViolinPlotChart visualization
- [x] 8.1 Create ViolinPlotChart class with distribution calculation
  - Set up SVG container with margins
  - Calculate probability density for each strategy
  - Create scales for X-axis (strategies) and Y-axis (P/L)
  - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [x] 8.2 Render violin shapes and box plots
  - Draw violin shapes using area generator
  - Overlay box plots with median, quartiles, whiskers
  - Apply semi-transparent coloring
  - _Requirements: 5.2, 5.4_

- [x] 8.3 Add interactivity
  - Implement tooltip showing summary statistics
  - Add hover effects on violins
  - Implement update() method
  - Add empty state handling
  - _Requirements: 5.5, 12.3_

- [x] 9. Implement WaterfallChart visualization
- [x] 9.1 Create WaterfallChart class with cumulative calculation
  - Set up SVG container with margins
  - Calculate cumulative P/L for each symbol
  - Create scales for X-axis (symbols) and Y-axis (P/L)
  - Limit to top 15 symbols by absolute P/L
  - _Requirements: 9.1, 9.2, 9.7_

- [x] 9.2 Render waterfall bars and connectors
  - Draw bars positioned at cumulative totals
  - Color bars green (positive) or red (negative)
  - Add connector lines between bars
  - Add final "Total" bar
  - _Requirements: 9.3, 9.4, 9.5_

- [x] 9.3 Add interactivity
  - Implement tooltip showing symbol and contribution
  - Add hover effects on bars
  - Implement update() method
  - Add empty state handling
  - _Requirements: 9.6, 12.3_

- [x] 10. Implement RadialChart visualization
- [x] 10.1 Create RadialChart class with circular layout
  - Set up SVG container with margins
  - Create radial scale for P/L magnitude
  - Position months clockwise around circle
  - Create color scale for strategies
  - _Requirements: 8.1, 8.2, 8.6_

- [x] 10.2 Render radial areas and legend
  - Draw area layers for each strategy
  - Apply strategy colors
  - Add legend outside circle
  - _Requirements: 8.2, 8.5_

- [x] 10.3 Add interactivity
  - Implement tooltip showing strategy, month, P/L
  - Add hover effects on areas
  - Implement update() method
  - Add empty state handling
  - _Requirements: 8.4, 12.3_

- [x] 11. Implement SankeyDiagramChart visualization
- [x] 11.1 Create SankeyDiagramChart class with node/link structure
  - Set up SVG container with margins
  - Transform trade data into Sankey nodes and links
  - Limit to top 10 symbols by trade count
  - Create three-column layout (Symbol | Strategy | Result)
  - _Requirements: 6.1, 6.6_

- [x] 11.2 Render Sankey diagram
  - Apply d3.sankey() layout algorithm
  - Draw node rectangles with labels
  - Draw flow paths with appropriate widths
  - Color flows by result (green/red)
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 11.3 Add interactivity
  - Implement tooltip showing flow details
  - Add hover effects on flows
  - Implement update() method
  - Add empty state handling
  - _Requirements: 6.5, 12.3_

- [x] 12. Implement HorizonChart visualization
- [x] 12.1 Create HorizonChart class with layered areas
  - Set up SVG container with compressed height (60px)
  - Create time scale for X-axis
  - Create threshold scale for color bands
  - Calculate cumulative P/L over time
  - _Requirements: 10.1, 10.2, 10.6_

- [x] 12.2 Render horizon layers
  - Create 4 color bands for magnitude ranges
  - Draw layered areas with clipping paths
  - Apply green gradient for positive, red for negative
  - _Requirements: 10.2, 10.3, 10.4_

- [x] 12.3 Add interactivity
  - Implement tooltip showing date and cumulative P/L
  - Add hover effects
  - Implement update() method
  - Add empty state handling
  - _Requirements: 10.5, 12.3_

- [x] 13. Add analytics engine methods for new visualizations
  - Add calculateDailyPL() method for heatmap calendar
  - Add calculateScatterData() method for scatter plot
  - Add calculateViolinData() method for violin plot
  - Add calculateSankeyData() method for Sankey diagram
  - Add calculateBubbleData() method for bubble chart
  - Add calculateRadialData() method for radial chart
  - Add calculateWaterfallData() method for waterfall chart
  - Add calculateHorizonData() method for horizon chart
  - _Requirements: 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1_

- [x] 14. Register all visualizations with AdvancedVisualizationPanel
  - Register HeatmapCalendarChart with "Calendar Heatmap" tab
  - Register ScatterPlotChart with "Days Held vs P/L" tab
  - Register ViolinPlotChart with "P/L Distribution" tab
  - Register SankeyDiagramChart with "Trade Flow" tab
  - Register BubbleChart with "Win Rate Analysis" tab
  - Register RadialChart with "Monthly Performance" tab
  - Register WaterfallChart with "P/L Attribution" tab
  - Register HorizonChart with "Long-term Trends" tab
  - _Requirements: 2.3, 2.4_

- [x] 15. Implement export functionality
- [x] 15.1 Add export button to visualization panel
  - Create export button UI in top-right corner
  - Add download icon and styling
  - Position button absolutely over visualization area
  - _Requirements: 13.1_

- [x] 15.2 Implement PNG export logic
  - Use html2canvas or similar library to capture visualization
  - Generate PNG blob from canvas
  - Trigger download with appropriate filename
  - Include chart title and filter settings in export
  - _Requirements: 13.2, 13.3, 13.4, 13.5_

- [x] 16. Add responsive design for mobile devices
  - Update tab navigation for horizontal scrolling on mobile
  - Adjust visualization dimensions for small screens
  - Test collapsible section on mobile
  - Ensure touch interactions work properly
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 17. Update DashboardController to manage new components
  - Add AdvancedVisualizationPanel to visualizations object
  - Update refreshDashboard() to update active visualization
  - Handle tab change events
  - Coordinate filter updates with active visualization
  - _Requirements: 2.6, 12.1, 12.2, 12.4_

- [x] 18. Add CSS styles for new components
  - Add styles for .advanced-viz-panel
  - Add styles for .viz-tabs and .viz-tab
  - Add styles for .collapsible-section
  - Add styles for .viz-export-btn
  - Add responsive media queries
  - _Requirements: 2.1, 2.2, 11.1, 11.2, 13.1_

- [x] 19. Update index.html with new script tags
  - Add script tag for CollapsibleSection component
  - Add script tag for AdvancedVisualizationPanel component
  - Add script tags for all 8 new visualization components
  - Ensure proper loading order
  - _Requirements: 2.1_

- [x] 20. Test filter integration with all visualizations
  - Test date range filter updates all visualizations
  - Test position status filter updates all visualizations
  - Verify loading indicators appear during updates
  - Verify empty states display correctly
  - Test performance with large datasets
  - _Requirements: 12.1, 12.2, 12.3, 12.4_
