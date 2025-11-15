# My Options Insights

A personal options trading analytics dashboard that helps you visualize and analyze your trading performance.

## Features

- 📊 **Comprehensive Analytics** - Track P/L, win rates, and performance metrics
- 📈 **Interactive Visualizations** - Multiple chart types including trends, breakdowns, and distributions
- 🎯 **Strategy Detection** - Automatically identifies trading strategies from your data
- 📅 **Flexible Filtering** - Filter by date range and position status
- 💾 **Data Persistence** - Your data is saved locally in your browser
- 🎨 **Modern UI** - Clean, responsive design with dark mode
- 🎭 **Demo Mode** - Try it out with sample data before uploading your own

## Quick Start

### Option 1: Try Demo Data (Recommended for First-Time Users)

1. Open `index.html` in your browser
2. Click **"Load Demo Data"** button
3. Explore the dashboard with 100 sample trades

### Option 2: Upload Your Own Data

1. Open `index.html` in your browser
2. Click **"Upload CSV"** button
3. Select your trading data CSV file
4. View your personalized analytics

## Demo Data

The demo data feature generates realistic sample trades with:
- 100 trades spanning the past year
- 10 different symbols (AAPL, TSLA, MSFT, SPY, NVDA, etc.)
- 8 different strategies (Long Call, Covered Call, Iron Condor, etc.)
- Mix of winning and losing trades with realistic win rates
- Both open and closed positions
- Multiple account types (Main, IRA, Roth IRA)

Perfect for:
- Testing the application before uploading real data
- Exploring features and visualizations
- Demos and presentations
- Development and testing

## Supported Brokers

The application automatically detects and adapts to CSV formats from:
- **Robinhood** - Full support for Robinhood export format
- **Tasty Trade** - Full support for Tasty Trade export format
- **Generic** - Works with any CSV containing basic trade data

See [BROKER_SUPPORT.md](BROKER_SUPPORT.md) for detailed format specifications.

## CSV Format

Your CSV should include these fields:
- Symbol, Type, Strategy, Strike, Expiry
- Volume, Entry, Delta, Exit
- Debit, Credit, Account

See [CSV-FORMAT.md](CSV-FORMAT.md) for complete specifications.

## Visualizations

### Core Charts
- **Summary Metrics Panel** - Key performance indicators at a glance
- **P/L Trend** - Track your profit/loss over time
- **Win Rate by Strategy** - Compare strategy effectiveness
- **P/L by Strategy** - See which strategies are most profitable
- **Win/Loss Distribution** - Donut chart of wins vs losses
- **Top Underlyings** - Best performing symbols

### Advanced Analytics
- **Calendar Heatmap** - Daily P/L visualization
- **Days Held vs P/L** - Scatter plot analysis
- **P/L Distribution** - Violin plot showing distribution
- **Trade Flow** - Sankey diagram of symbol to outcome
- **Win Rate Analysis** - Bubble chart by strategy
- **Monthly Performance** - Radial chart of monthly results
- **P/L Attribution** - Waterfall chart by symbol
- **Long-term Trends** - Horizon chart for extended periods

## Filters

- **Date Range**: Last 7 days, 30 days, 12 months, YTD, All time
- **Position Status**: Open, Closed, or All positions

## Local Development

1. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```

2. Open in browser:
   ```
   http://localhost:8000
   ```

3. Load demo data or upload your CSV

## Testing

Run the test suite to verify everything works:

```bash
node run-tests.js
```

Or open the test pages in your browser:
- `tests/automated-test.html` - Full automated test suite
- `tests/test-demo-data.html` - Demo data generator tests
- `tests/test-broker-adapters.html` - Broker format tests

See [TESTING.md](TESTING.md) for complete testing documentation.

## Privacy & Security

- **100% Client-Side** - All processing happens in your browser
- **No Server Required** - Your data never leaves your computer
- **Local Storage Only** - Data is saved in your browser's localStorage
- **No Analytics** - No tracking or data collection
- **Open Source** - Review the code yourself

## Browser Support

Works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Requires JavaScript enabled and localStorage support.

## Project Structure

```
├── index.html                 # Main application
├── css/
│   └── styles.css            # Application styles
├── js/
│   ├── main.js               # Application entry point
│   ├── dashboard-controller.js
│   ├── broker-adapters.js    # Multi-broker support
│   ├── csv-parser.js         # CSV parsing
│   ├── strategy-detector.js  # Strategy identification
│   ├── analytics-engine.js   # Data analysis
│   ├── data-store.js         # localStorage management
│   ├── demo-data-generator.js # Demo data generation
│   └── visualizations/       # Chart components
├── tests/                    # Test suite
└── sample-data-messy.csv     # Sample data file
```

## License

See [LICENSE](LICENSE) file for details.

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## Troubleshooting

### Demo Data Not Loading
- Check browser console (F12) for errors
- Ensure JavaScript is enabled
- Try refreshing the page

### CSV Upload Fails
- Verify CSV format matches specifications
- Check for required fields (Symbol, Entry, Debit, Credit)
- Ensure dates are in valid format (YYYY-MM-DD or MM/DD/YYYY)
- See error modal for specific issues

### Charts Not Displaying
- Ensure D3.js library loaded (check console)
- Try clearing browser cache
- Verify data was loaded successfully

### Data Not Persisting
- Check localStorage is enabled in browser
- Verify you're not in private/incognito mode
- Check available storage space (quota may be exceeded)

## Roadmap

Future enhancements:
- Export reports to PDF
- More advanced strategy detection
- Comparison with benchmarks
- Mobile app version
- Multi-currency support

---

**Made with ❤️ for options traders**
