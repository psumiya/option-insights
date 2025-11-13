# Requirements Document - Options Trading Journal & Analytics

## Introduction

The Options Trading Journal & Analytics system is a web-based application that enables retail options traders to analyze their trading performance through interactive visualizations and metrics. The system processes trade data from CSV files and displays analytics across multiple dimensions including profit/loss trends, win rates, strategy performance, and symbol-based breakdowns. The initial version focuses on client-side CSV processing with browser-based analytics, with architecture designed to support future platform integrations.

## Glossary

- **Trading Journal System**: The complete web application including CSV processing, data storage, and analytics dashboard
- **Trade Record**: A single row of trade data containing all fields for one options position
- **Strategy**: The options trading approach (e.g., "Long Call", "Iron Condor", "Credit Spread")
- **Leg**: An individual option contract within a multi-leg strategy
- **P/L**: Profit/Loss calculated as Credit minus Debit
- **DTE**: Days To Expiration
- **Premium Percentage**: P/L divided by Credit, expressed as a percentage
- **Win Rate**: Percentage of closed trades that resulted in profit
- **Dashboard**: The main analytics interface displaying visualizations and metrics
- **CSV Parser**: Component that reads and validates CSV trade data
- **Data Store**: Browser localStorage mechanism for persisting trade data between sessions
- **Visualization Engine**: D3.js-based component that renders charts and graphs

## Requirements

### Requirement 1: CSV Data Import

**User Story:** As a retail options trader, I want to upload my trade data via CSV file, so that I can analyze my trading performance without manual data entry.

#### Acceptance Criteria

1. WHEN the user selects a CSV file through the file input control, THE Trading Journal System SHALL parse the CSV file and extract trade records
2. THE Trading Journal System SHALL validate that each trade record contains the required fields: Symbol, Type, Strategy, Strike, Expiry, Volume, Entry, Delta, Debit, Credit, Account
3. IF a trade record is missing required fields, THEN THE Trading Journal System SHALL display an error message identifying the missing fields and the row number
4. WHEN CSV parsing completes successfully, THE Trading Journal System SHALL store the trade records in the Data Store
5. THE Trading Journal System SHALL provide a visible control to reload or replace the current CSV data

### Requirement 2: Computed Field Calculation

**User Story:** As a retail options trader, I want the system to automatically calculate derived metrics from my raw trade data, so that I have consistent analytics regardless of my data source.

#### Acceptance Criteria

1. WHEN a trade record is processed, THE Trading Journal System SHALL calculate Days to Expire at Entry as Expiry date minus Entry date
2. WHEN a trade record is processed, THE Trading Journal System SHALL calculate P/L as Credit minus Debit
3. WHEN a trade record is processed, THE Trading Journal System SHALL calculate Premium Percentage as P/L divided by Credit
4. WHEN a trade record has an Exit date, THE Trading Journal System SHALL calculate Days Held as Exit date minus Entry date
5. WHEN a trade record has an Exit date, THE Trading Journal System SHALL calculate Remaining DTE as Expiry date minus Exit date
6. WHEN a trade record has an Exit date and P/L is greater than zero, THE Trading Journal System SHALL set Result to "Win"
7. WHEN a trade record has an Exit date and P/L is less than or equal to zero, THE Trading Journal System SHALL set Result to "Loss"
8. WHEN a trade record has no Exit date, THE Trading Journal System SHALL set Result to "Open"

### Requirement 3: Data Persistence

**User Story:** As a retail options trader, I want my uploaded trade data to persist between browser sessions, so that I do not need to re-upload my CSV file every time I visit the dashboard.

#### Acceptance Criteria

1. WHEN trade records are successfully parsed from CSV, THE Trading Journal System SHALL store the trade records in browser localStorage
2. WHEN the user loads the application, THE Trading Journal System SHALL retrieve trade records from the Data Store
3. WHEN the user initiates a data reload action, THE Trading Journal System SHALL clear existing data from the Data Store and prompt for new CSV upload
4. THE Trading Journal System SHALL handle localStorage quota exceeded errors by displaying an error message to the user

### Requirement 4: Profit/Loss Trend Visualization

**User Story:** As a retail options trader, I want to see my profit/loss trend over time, so that I can understand my trading performance trajectory.

#### Acceptance Criteria

1. THE Dashboard SHALL display a line chart showing cumulative P/L by month using the Visualization Engine
2. THE Dashboard SHALL default the P/L trend chart to display the trailing 12 months of data
3. WHEN the user applies a date range filter, THE Dashboard SHALL update the P/L trend chart to display data within the selected date range
4. THE Dashboard SHALL calculate monthly P/L by summing all closed trade P/L values within each month
5. THE Visualization Engine SHALL render the P/L trend chart with labeled axes showing month labels and P/L values

### Requirement 5: Win Rate Analytics

**User Story:** As a retail options trader, I want to see win rates broken down by strategy, so that I can identify which strategies are most successful for me.

#### Acceptance Criteria

1. THE Dashboard SHALL display win rate metrics grouped by Strategy
2. THE Dashboard SHALL calculate win rate count as the number of trades with Result equal to "Win" divided by total closed trades for each Strategy
3. THE Dashboard SHALL display win rate as a percentage for each Strategy
4. THE Dashboard SHALL display total dollar amount of wins for each Strategy by summing P/L for all winning trades
5. WHEN calculating win rates, THE Dashboard SHALL exclude trades with Result equal to "Open"

### Requirement 6: Strategy Performance Breakdown

**User Story:** As a retail options trader, I want to see P/L breakdowns by buy versus sell operations grouped by strategy and trading platform, so that I can understand which approaches work best on each platform.

#### Acceptance Criteria

1. THE Dashboard SHALL display P/L totals grouped by Type (buy/sell), Strategy, and Account
2. THE Dashboard SHALL calculate P/L totals by summing all P/L values for closed trades within each grouping
3. THE Visualization Engine SHALL render a grouped bar chart showing P/L by Type and Strategy
4. THE Dashboard SHALL display P/L breakdown by Account showing total P/L per trading platform
5. WHEN the user applies a date range filter, THE Dashboard SHALL recalculate all P/L breakdowns for the selected date range

### Requirement 7: Symbol and Strategy Analytics

**User Story:** As a retail options trader, I want to see P/L breakdowns by ticker symbol and strategy, so that I can identify which stocks and strategies are most profitable for me.

#### Acceptance Criteria

1. THE Dashboard SHALL display P/L totals grouped by Symbol
2. THE Dashboard SHALL display P/L totals grouped by Strategy
3. THE Dashboard SHALL display P/L totals grouped by the combination of Symbol and Strategy
4. THE Dashboard SHALL sort P/L breakdowns by total P/L in descending order
5. THE Visualization Engine SHALL render bar charts for Symbol-based and Strategy-based P/L breakdowns

### Requirement 8: Date Range Filtering

**User Story:** As a retail options trader, I want to filter my analytics by different time periods, so that I can analyze recent performance versus historical trends.

#### Acceptance Criteria

1. THE Dashboard SHALL provide date range filter options: Last 7 Days, Last 30 Days, Last 12 Months, Year to Date, All Time
2. WHEN the user selects a date range filter, THE Dashboard SHALL filter all trade records based on the Exit date falling within the selected range
3. WHEN the user selects a date range filter, THE Dashboard SHALL update all visualizations and metrics to reflect only the filtered data
4. THE Dashboard SHALL default to displaying Last 12 Months when initially loaded
5. WHEN a trade has no Exit date, THE Dashboard SHALL include the trade in filtered results if the Entry date falls within the selected range

### Requirement 9: Open vs Closed Position Toggle

**User Story:** As a retail options trader, I want to toggle between viewing open positions and closed positions, so that I can analyze active trades separately from completed trades.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control with options: Closed Positions, Open Positions, All Positions
2. THE Dashboard SHALL default to displaying Closed Positions when initially loaded
3. WHEN the user selects Closed Positions, THE Dashboard SHALL display only trades where Result is "Win" or "Loss"
4. WHEN the user selects Open Positions, THE Dashboard SHALL display only trades where Result is "Open"
5. WHEN the user selects All Positions, THE Dashboard SHALL display all trades regardless of Result value
6. WHEN the position filter changes, THE Dashboard SHALL update all visualizations and metrics accordingly

### Requirement 10: Strategy Detection Architecture

**User Story:** As a developer, I want a modular architecture for strategy detection, so that we can add automated strategy classification in future iterations without refactoring the codebase.

#### Acceptance Criteria

1. THE Trading Journal System SHALL implement a Strategy Detector component with a pluggable interface
2. WHERE the Strategy field is present in the CSV, THE Strategy Detector SHALL use the manually entered Strategy value
3. THE Strategy Detector SHALL provide a method signature that accepts trade leg data and returns a Strategy classification
4. THE Trading Journal System SHALL invoke the Strategy Detector for each trade record during CSV processing
5. THE Strategy Detector SHALL default to returning the manually entered Strategy value when no automated detection logic is implemented

### Requirement 11: Responsive User Interface

**User Story:** As a retail options trader, I want the dashboard to work well on different screen sizes, so that I can analyze my trades on desktop and tablet devices.

#### Acceptance Criteria

1. THE Dashboard SHALL use responsive CSS layout that adapts to viewport widths from 768 pixels to 1920 pixels
2. THE Dashboard SHALL render all visualizations with dimensions proportional to the viewport size
3. WHEN the viewport width is less than 1024 pixels, THE Dashboard SHALL stack visualization components vertically
4. THE Dashboard SHALL use Tailwind CSS utility classes for responsive layout implementation
5. THE Visualization Engine SHALL redraw charts when the viewport size changes
6. THE Dashboard SHALL display all primary visualizations on initial load without requiring user interaction to reveal charts

### Requirement 12: Error Handling and User Feedback

**User Story:** As a retail options trader, I want clear error messages when something goes wrong, so that I can understand and resolve issues with my data or the application.

#### Acceptance Criteria

1. WHEN CSV parsing fails, THE Trading Journal System SHALL display an error message describing the parsing failure and the affected row number
2. WHEN date calculations encounter invalid date values, THE Trading Journal System SHALL skip the calculation and log a warning message
3. WHEN localStorage operations fail, THE Trading Journal System SHALL display an error message and continue operating with in-memory data only
4. WHEN no trade data is available, THE Dashboard SHALL display a message prompting the user to upload a CSV file
5. THE Trading Journal System SHALL display loading indicators during CSV processing operations that exceed 500 milliseconds

### Requirement 13: Summary Metrics Dashboard

**User Story:** As a retail options trader, I want to see key performance metrics at a glance at the top of my dashboard, so that I can quickly assess my overall trading performance without scrolling through detailed charts.

#### Acceptance Criteria

1. THE Dashboard SHALL display four summary metric panels in a 2x2 grid layout at the top of the dashboard
2. THE Dashboard SHALL display Total Trades count showing the number of closed trades in the filtered dataset
3. THE Dashboard SHALL display Win Rate as a percentage calculated by dividing winning trades by total closed trades
4. THE Dashboard SHALL display Total P/L as the sum of all P/L values for closed trades in the filtered dataset
5. THE Dashboard SHALL display Average Win calculated by dividing the sum of all winning trade P/L values by the count of winning trades
6. WHEN the user applies date range or position status filters, THE Dashboard SHALL update all summary metrics to reflect the filtered data
7. THE Dashboard SHALL format currency values in the summary panels with dollar sign and two decimal places
8. THE Dashboard SHALL format percentage values in the summary panels with one decimal place and percentage symbol

### Requirement 14: Win/Loss Distribution Visualization

**User Story:** As a retail options trader, I want to see the distribution of my winning versus losing trades as a donut chart, so that I can quickly understand the proportion of successful trades in my portfolio.

#### Acceptance Criteria

1. THE Dashboard SHALL display a donut chart showing the distribution of winning trades versus losing trades
2. THE Dashboard SHALL calculate the count of trades where Result equals "Win" for the winning segment
3. THE Dashboard SHALL calculate the count of trades where Result equals "Loss" for the losing segment
4. THE Visualization Engine SHALL render the donut chart with two segments colored distinctly for wins and losses
5. THE Visualization Engine SHALL display the percentage value for each segment within or adjacent to the donut chart
6. THE Visualization Engine SHALL display the absolute count of trades for each segment on hover
7. WHEN the user applies filters, THE Dashboard SHALL update the win/loss distribution chart to reflect the filtered data
8. WHEN calculating win/loss distribution, THE Dashboard SHALL exclude trades with Result equal to "Open"

### Requirement 15: Top Performing Underlyings

**User Story:** As a retail options trader, I want to see my top 5 most profitable underlying symbols based on total winning dollars, so that I can identify which stocks generate the most profit for my trading strategies.

#### Acceptance Criteria

1. THE Dashboard SHALL display a bar chart showing the top 5 underlying symbols by total winning dollars
2. THE Dashboard SHALL calculate winning dollars for each Symbol by summing P/L values where Result equals "Win"
3. THE Dashboard SHALL sort symbols by total winning dollars in descending order and select the top 5
4. THE Visualization Engine SHALL render a horizontal bar chart with Symbol names on the y-axis and winning dollars on the x-axis
5. THE Dashboard SHALL display the exact dollar amount at the end of each bar in the chart
6. WHEN the user applies date range or position status filters, THE Dashboard SHALL recalculate the top 5 underlyings based on the filtered data
7. WHEN fewer than 5 symbols have winning trades, THE Dashboard SHALL display all available symbols with winning trades
