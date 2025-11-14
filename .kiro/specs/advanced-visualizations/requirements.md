# Requirements Document

## Introduction

This feature enhances the options trading analytics dashboard by adding advanced D3.js visualizations and improving the UI presentation. Users will be able to choose from multiple visualization types through a tabbed or card-based interface, allowing them to explore their trading data from different analytical perspectives. The feature also improves the existing table presentation by making it collapsible to reduce scrolling.

## Glossary

- **Dashboard**: The main analytics interface displaying trade data and visualizations
- **Visualization Panel**: A container that can display different chart types based on user selection
- **Collapsible Section**: A UI component that can be expanded or collapsed to show/hide content
- **Tab Interface**: A navigation pattern where clicking tabs switches between different content views
- **Heatmap Calendar**: A calendar-style visualization showing daily P/L with color intensity
- **Scatter Plot**: A chart plotting two variables as points on X/Y axes
- **Violin Plot**: A chart showing the probability distribution of data
- **Sankey Diagram**: A flow diagram showing relationships between categories
- **Bubble Chart**: A scatter plot where point size represents a third variable
- **Radial Chart**: A circular chart displaying data around a center point
- **Waterfall Chart**: A chart showing cumulative effect of sequential values
- **Horizon Chart**: A compressed time-series visualization

## Requirements

### Requirement 1: Collapsible Table Section

**User Story:** As a trader with many trades, I want the P/L by Symbol & Strategy table to be collapsible, so that I can reduce scrolling and focus on visualizations when needed

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL render the P/L by Symbol & Strategy table in a collapsed state by default
2. WHEN a user clicks the expand button on the table section, THE Dashboard SHALL expand the section to reveal the full table
3. WHEN a user clicks the collapse button on an expanded table section, THE Dashboard SHALL collapse the section to hide the table
4. WHEN the table section state changes, THE Dashboard SHALL animate the transition smoothly over 300 milliseconds
5. WHEN the table section is collapsed, THE Dashboard SHALL display a summary indicator showing the total number of rows available

### Requirement 2: Multi-Visualization Panel Container

**User Story:** As a trader, I want to choose from multiple advanced visualization types in the same screen area, so that I can analyze my data from different perspectives without cluttering the interface

#### Acceptance Criteria

1. THE Dashboard SHALL create a new visualization panel section below the existing Top Underlyings chart
2. THE Dashboard SHALL display a tab navigation interface above the visualization panel
3. WHEN the panel loads, THE Dashboard SHALL display the first visualization tab as active by default
4. WHEN a user clicks a different tab, THE Dashboard SHALL switch to display the corresponding visualization
5. WHEN switching tabs, THE Dashboard SHALL animate the transition with a fade effect over 200 milliseconds
6. THE Dashboard SHALL maintain the selected tab state when filters are applied
7. THE Dashboard SHALL render only the active visualization to optimize performance

### Requirement 3: Heatmap Calendar Visualization

**User Story:** As a trader, I want to see a calendar heatmap of my daily P/L, so that I can identify patterns in my trading days and avoid unprofitable periods

#### Acceptance Criteria

1. THE Dashboard SHALL render a calendar heatmap showing daily P/L for closed trades
2. WHEN displaying the calendar, THE Dashboard SHALL organize dates in a week-row format with months labeled
3. THE Dashboard SHALL color-code each day cell based on P/L amount using a diverging color scale from red (loss) through white (neutral) to green (profit)
4. WHEN a user hovers over a day cell, THE Dashboard SHALL display a tooltip showing the date, P/L amount, and trade count
5. THE Dashboard SHALL display only days with closed trades, leaving other days empty or grayed out
6. THE Dashboard SHALL show the most recent 12 months of data by default

### Requirement 4: Scatter Plot - Days Held vs P/L

**User Story:** As a trader, I want to see how holding period correlates with profitability, so that I can optimize my exit timing

#### Acceptance Criteria

1. THE Dashboard SHALL render a scatter plot with Days Held on the X-axis and P/L on the Y-axis
2. THE Dashboard SHALL plot each closed trade as a point on the scatter plot
3. THE Dashboard SHALL color-code points by Strategy using distinct colors
4. WHEN a user hovers over a point, THE Dashboard SHALL display a tooltip showing Symbol, Strategy, Days Held, and P/L
5. THE Dashboard SHALL include a legend identifying the color coding for each Strategy
6. THE Dashboard SHALL add a horizontal reference line at Y=0 to distinguish wins from losses

### Requirement 5: Violin Plot - P/L Distribution by Strategy

**User Story:** As a trader, I want to see the full distribution of outcomes for each strategy, so that I can understand consistency and risk beyond just averages

#### Acceptance Criteria

1. THE Dashboard SHALL render a violin plot showing P/L distribution for each Strategy
2. THE Dashboard SHALL display each Strategy as a separate violin shape on the X-axis
3. THE Dashboard SHALL calculate the probability density distribution of P/L values for each Strategy
4. THE Dashboard SHALL overlay a box plot inside each violin showing median, quartiles, and outliers
5. WHEN a user hovers over a violin, THE Dashboard SHALL display summary statistics including median, mean, and standard deviation
6. THE Dashboard SHALL include only closed trades in the distribution calculation

### Requirement 6: Sankey Diagram - Trade Flow

**User Story:** As a trader, I want to see how trades flow from symbols through strategies to outcomes, so that I can identify which symbol-strategy combinations work best

#### Acceptance Criteria

1. THE Dashboard SHALL render a Sankey diagram with three columns: Symbol, Strategy, and Result
2. THE Dashboard SHALL create flow paths connecting Symbol nodes to Strategy nodes to Result nodes
3. THE Dashboard SHALL size each flow path proportionally to the total P/L amount
4. THE Dashboard SHALL color-code flows based on the Result (green for Win, red for Loss)
5. WHEN a user hovers over a flow path, THE Dashboard SHALL display the Symbol, Strategy, Result, trade count, and total P/L
6. THE Dashboard SHALL limit the Symbol column to the top 10 symbols by trade count to maintain readability

### Requirement 7: Bubble Chart - Win Rate vs Average Win

**User Story:** As a trader, I want to compare strategies by win rate and average win size simultaneously, so that I can identify high-quality strategies

#### Acceptance Criteria

1. THE Dashboard SHALL render a bubble chart with Win Rate percentage on the X-axis and Average Win amount on the Y-axis
2. THE Dashboard SHALL plot each Strategy as a bubble
3. THE Dashboard SHALL size each bubble proportionally to the total trade count for that Strategy
4. THE Dashboard SHALL color-code bubbles based on net P/L using a gradient from red (negative) to green (positive)
5. WHEN a user hovers over a bubble, THE Dashboard SHALL display Strategy name, Win Rate, Average Win, Trade Count, and Net P/L
6. THE Dashboard SHALL add reference lines at 50% win rate (X-axis) and $0 average win (Y-axis) to create quadrants

### Requirement 8: Radial Chart - Strategy Performance by Month

**User Story:** As a trader, I want to see strategy performance across months in a circular format, so that I can identify seasonal patterns

#### Acceptance Criteria

1. THE Dashboard SHALL render a radial area chart with months arranged clockwise around the circle
2. THE Dashboard SHALL plot each Strategy as a separate colored area layer
3. THE Dashboard SHALL position each month's P/L value as distance from the center (radius)
4. WHEN a user hovers over an area segment, THE Dashboard SHALL display the Strategy, Month, and P/L amount
5. THE Dashboard SHALL include a legend identifying each Strategy by color
6. THE Dashboard SHALL show the most recent 12 months of data

### Requirement 9: Waterfall Chart - P/L Attribution

**User Story:** As a trader, I want to see how different factors contribute to my total P/L, so that I can understand what's driving my performance

#### Acceptance Criteria

1. THE Dashboard SHALL render a waterfall chart showing P/L contributions by Symbol
2. THE Dashboard SHALL display bars sequentially from left to right, each representing a Symbol's contribution
3. THE Dashboard SHALL position each bar starting from the cumulative total of previous bars
4. THE Dashboard SHALL color-code bars as green for positive contributions and red for negative contributions
5. THE Dashboard SHALL display a final "Total" bar showing the cumulative P/L
6. WHEN a user hovers over a bar, THE Dashboard SHALL display the Symbol name and P/L contribution
7. THE Dashboard SHALL limit the display to the top 15 symbols by absolute P/L contribution

### Requirement 10: Horizon Chart - Compressed Time Series

**User Story:** As a trader with extensive history, I want to see long-term P/L trends in a compact format, so that I can spot patterns without excessive scrolling

#### Acceptance Criteria

1. THE Dashboard SHALL render a horizon chart showing daily cumulative P/L over time
2. THE Dashboard SHALL compress the vertical space by layering positive and negative values
3. THE Dashboard SHALL use color bands to represent magnitude ranges (darker = larger absolute value)
4. THE Dashboard SHALL display positive values above the baseline and negative values below
5. WHEN a user hovers over the chart, THE Dashboard SHALL display the date and cumulative P/L value
6. THE Dashboard SHALL show all available historical data in the filtered date range

### Requirement 11: Responsive Tab Navigation

**User Story:** As a trader using different devices, I want the visualization tabs to work well on mobile and desktop, so that I can analyze trades anywhere

#### Acceptance Criteria

1. WHEN the viewport width is less than 768 pixels, THE Dashboard SHALL display tabs in a scrollable horizontal row
2. WHEN the viewport width is 768 pixels or greater, THE Dashboard SHALL display tabs in a wrapped grid layout
3. THE Dashboard SHALL highlight the active tab with a distinct background color and border
4. THE Dashboard SHALL ensure tab labels are readable and not truncated
5. WHEN a user selects a tab on mobile, THE Dashboard SHALL scroll the tab into view if needed

### Requirement 12: Visualization Data Updates

**User Story:** As a trader applying filters, I want all visualizations to update automatically, so that I see consistent data across all views

#### Acceptance Criteria

1. WHEN a user changes the date range filter, THE Dashboard SHALL recalculate and re-render the active visualization
2. WHEN a user changes the position status filter, THE Dashboard SHALL recalculate and re-render the active visualization
3. THE Dashboard SHALL display a loading indicator during visualization updates that take longer than 100 milliseconds
4. THE Dashboard SHALL maintain smooth performance when switching between visualizations after filter changes
5. WHEN no data is available for a visualization, THE Dashboard SHALL display an appropriate empty state message

### Requirement 13: Visualization Export Capability

**User Story:** As a trader, I want to save visualizations as images, so that I can include them in reports or share with others

#### Acceptance Criteria

1. THE Dashboard SHALL display an export button in the top-right corner of each visualization panel
2. WHEN a user clicks the export button, THE Dashboard SHALL generate a PNG image of the current visualization
3. THE Dashboard SHALL trigger a download of the PNG file with a filename including the visualization type and current date
4. THE Dashboard SHALL include the chart title and current filter settings in the exported image
5. THE Dashboard SHALL maintain the visual quality and colors of the exported image
