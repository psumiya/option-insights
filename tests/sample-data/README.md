# Sample Data

This directory contains sample CSV files used for testing the Options Trading Journal.

## Files

- **Hood.csv** - Sample Robinhood export format (for testing)
- **Tasty.csv** - Sample Tasty Trade export format (for testing)
- **sample-data-messy.csv** - Generic CSV format with various edge cases

## Usage

These files are referenced by the automated test suite in the `tests/` directory. The tests verify:
- CSV parsing for different broker formats
- Data quality validation
- Trade enrichment and analytics calculations

## Privacy Note

The original CSV filenames have been anonymized. If you want to test with your own data:
1. Export your trades from your broker
2. Place the CSV file in this directory
3. Upload it through the main application interface

**Important:** Never commit your personal trading data to version control. Add your CSV files to `.gitignore` if needed.
