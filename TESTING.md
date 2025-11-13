# Testing Guide

## Automated Testing

I've created a comprehensive automated test suite that verifies everything works without manual clicking.

### Quick Start

1. **Make sure the server is running:**
   ```bash
   python3 -m http.server 8000
   ```

2. **Run the automated tests:**
   ```bash
   node run-tests.js
   ```

3. **Open the test page in your browser:**
   ```
   http://localhost:8000/tests/automated-test.html
   ```

The tests will run automatically and show you a detailed report!

## What Gets Tested

### ✅ Core Components (8 tests)
- All JavaScript classes load correctly
- Broker detection works for Robinhood, Tasty, and Generic formats
- Adapters can be created successfully

### ✅ Robinhood CSV (3 tests)
- File loads successfully
- CSV parses into trades
- Data quality validation (Symbol, Entry, Credit, Debit)

### ✅ Tasty CSV (3 tests)
- File loads successfully
- CSV parses into trades
- Data quality validation

### ✅ Generic CSV (3 tests)
- File loads successfully
- CSV parses with missing fields
- Lenient validation works

### ✅ Data Processing (3 tests)
- Strategy detection works
- Analytics enrichment calculates P/L, days held, etc.
- DataStore saves and loads from localStorage

## Test Results

The automated test page shows:
- ✓ **Green** = Test passed
- ✗ **Red** = Test failed (with error details)
- **Summary** = Total tests, passed, failed, duration

## Manual Testing (if needed)

### Test Individual Brokers
```
http://localhost:8000/tests/test-broker-adapters.html
```
Click buttons to test each broker format individually.

### Test Simple Components
```
http://localhost:8000/tests/test-simple.html
```
Verifies basic class loading and broker detection.

### Test Main Application
```
http://localhost:8000/index.html
```
Upload your actual CSV files and see the full dashboard.

## Debugging Failed Tests

If tests fail, check the browser console (F12) for:

1. **Script loading errors**
   ```
   Failed to load resource: js/broker-adapters.js
   ```
   → Make sure server is running

2. **CSV loading errors**
   ```
   HTTP 404: Hood.csv not found
   ```
   → Make sure CSV files are in the root directory

3. **Parsing errors**
   ```
   BrokerAdapter is not defined
   ```
   → Check script loading order in HTML

4. **Data quality errors**
   ```
   Trade 5: Missing Symbol
   ```
   → Check CSV format and data

## Continuous Testing

The automated test suite runs:
- **Automatically** when you open the page
- **On demand** by clicking "Run All Tests" button
- **Fast** - completes in ~2-3 seconds

## Test Files

| File | Purpose |
|------|---------|
| `tests/automated-test.html` | Full automated test suite |
| `tests/test-broker-adapters.html` | Manual broker testing |
| `tests/test-simple.html` | Basic component verification |
| `run-tests.js` | CLI test runner |

## Expected Results

With the provided CSV files, you should see:
- **Total Tests**: 20
- **Passed**: 20
- **Failed**: 0
- **Duration**: ~2-3 seconds

If any tests fail, the error details will show exactly what went wrong!

## CI/CD Integration

You can integrate this into your build process:

```bash
# Start server in background
python3 -m http.server 8000 &
SERVER_PID=$!

# Run tests
node run-tests.js

# Stop server
kill $SERVER_PID
```

For headless browser testing, you could add Puppeteer or Playwright to actually execute the tests and capture results programmatically.
