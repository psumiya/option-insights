# Robinhood P/L Troubleshooting Guide

## Quick Diagnosis

### Problem: "Closing transaction without open position" warnings

**What it means:** Your CSV file has closing transactions (STC/BTC) but is missing the corresponding opening transactions (STO/BTO).

**Why it happens:**
- CSV date range is too short
- Position was opened before the CSV start date
- Robinhood export doesn't include older transactions

**Solution:**
1. Go to Robinhood → Account → Statements & History
2. Export transactions for **"All Time"** or a longer date range
3. Re-upload the complete CSV file

---

## P/L Discrepancy Checklist

If your calculated P/L doesn't match Robinhood:

### ✅ Check 1: Date Range
- [ ] Does your CSV include ALL transactions from when you started trading?
- [ ] Are there any "Partial" trades in the results?
- [ ] Do you see warnings about unmatched closes?

**Fix:** Download a longer date range from Robinhood

### ✅ Check 2: Transaction Types
Look at the console log for "Transaction types found":
- [ ] Are there non-option codes like "DEP" (deposits), "INT" (interest), "DIV" (dividends)?
- [ ] These should be filtered out automatically

**Expected:** Only STO, BTO, STC, BTC should be processed

### ✅ Check 3: Amount Validation
- [ ] Check for warnings about "Suspicious amount detected"
- [ ] Option premiums are typically < $10,000 per contract

**Fix:** If you see large amounts, verify they're actually option trades

### ✅ Check 4: Open Positions
- [ ] Do you have open positions in Robinhood?
- [ ] Open positions don't affect closed P/L but are shown separately

**Expected:** Open trades should show "Exit: null" and not be included in P/L

---

## Understanding the Console Output

When you upload a CSV, look for this in the console:

```
=== Robinhood Adapter Processing ===
Total CSV rows: 150
Transaction types found: { STO: 45, BTC: 40, STC: 30, BTO: 25, DEP: 10 }

=== Results ===
Total trades created: 85
  - Closed trades (matched): 70
  - Partial trades (unmatched close): 15
  - Open trades: 0

=== P/L Summary ===
Total P/L from all closed trades: $-3859.00
  - P/L from partial trades: $-500.00
  - P/L from matched trades: $-3359.00

WARNING: 15 trades have incomplete data.
```

### What to look for:

1. **Transaction types**: Should mostly be STO/BTO/STC/BTC
   - If you see many DEP, INT, DIV → Good, they're being filtered out
   
2. **Partial trades**: Should be 0 or very few
   - If many partial trades → Download longer date range
   
3. **Total P/L**: Should match Robinhood (within a few dollars)
   - If way off → Check for partial trades or date range issues

---

## Common Scenarios

### Scenario 1: P/L is close but not exact
**Difference:** $5-50
**Likely cause:** Rounding differences, fees, or assignment/exercise events
**Action:** This is normal, consider it acceptable

### Scenario 2: P/L is way off (hundreds or thousands)
**Difference:** $100+
**Likely cause:** Missing opening transactions (partial trades)
**Action:** Download complete transaction history from Robinhood

### Scenario 3: P/L is positive when it should be negative
**Likely cause:** Credits/debits reversed or deposits included
**Action:** Check console for transaction types and suspicious amounts

### Scenario 4: Many unmatched warnings
**Likely cause:** CSV date range too short
**Action:** Export "All Time" transactions from Robinhood

### Scenario 5: Trade marked as partial but opening transaction exists
**Likely cause:** Quantity mismatch - opened multiple contracts in one transaction, closed separately
**Example:** Opened 2 contracts together, closed as 1+1 separately
**Action:** This is now handled correctly! The adapter will split the opening position and match each closing transaction proportionally

---

## Step-by-Step Fix Process

1. **Open test page**: `test-robinhood-pl.html`
2. **Upload your CSV**
3. **Check console output**:
   - Look for "WARNING: X trades have incomplete data"
   - Note the number of partial trades
4. **If partial trades > 0**:
   - Go to Robinhood
   - Export longer date range (ideally "All Time")
   - Re-upload new CSV
5. **Verify P/L matches** Robinhood's reported value
6. **If still off**, check for:
   - Suspicious amounts in console
   - Non-option transaction types
   - Open positions being counted

---

## Getting Help

If you're still seeing issues after following this guide:

1. **Check the console log** - Copy the entire output
2. **Note the specific numbers**:
   - Robinhood's reported P/L: $______
   - Calculated P/L: $______
   - Number of partial trades: ______
   - Date range of CSV: ______ to ______
3. **Look for patterns** in the warnings
4. **Verify your CSV includes all historical data**

The most common issue is incomplete CSV data - make sure you're exporting the full transaction history!
