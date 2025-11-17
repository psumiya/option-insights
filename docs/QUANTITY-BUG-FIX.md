# Quantity Matching Bug Fix

## The Bug You Found

**Problem:** When you opened 2 contracts in a single transaction but closed them as 2 separate transactions (1 contract each), the second closing transaction was incorrectly marked as "partial" even though the opening transaction was in the CSV.

**Root Cause:** The original code used `positions.shift()` which removed the entire opening position after the first close, regardless of how many contracts were actually closed. This meant:
1. Open 2 contracts → Position created with quantity 2
2. Close 1 contract → Entire position removed (both contracts)
3. Close 1 contract → No position found → Marked as partial ❌

## The Fix

**Solution:** Implemented proper quantity tracking with proportional amount calculation.

### Key Changes:

1. **Quantity-Aware Matching:**
```javascript
// OLD (WRONG)
const openPos = positions.shift(); // Removes entire position

// NEW (CORRECT)
const openPos = positions[0]; // Peek at position
const contractsToClose = Math.min(remainingToClose, openPos.quantity);
// ... create trade ...
openPos.quantity -= contractsToClose; // Reduce quantity
if (openPos.quantity <= 0) {
  positions.shift(); // Only remove when fully closed
}
```

2. **Proportional Amount Calculation:**
```javascript
// Calculate per-contract amounts
const openAmountPerContract = openPos.openAmount / openPos.quantity;
const closeAmountPerContract = amount / quantity;

// Apply to contracts being closed
const proportionalOpenAmount = openAmountPerContract * contractsToClose;
const proportionalCloseAmount = closeAmountPerContract * contractsToClose;
```

3. **Loop Through Remaining Contracts:**
```javascript
let remainingToClose = quantity;
while (remainingToClose > 0 && positions && positions.length > 0) {
  // Match contracts from oldest position (FIFO)
  // Create trade for matched portion
  // Update remaining quantity
}
```

## Example: Your Scenario

**Transactions:**
```
Day 1: STO 2 QQQ Call $460 @ $100 each = $200 credit
Day 5: BTC 1 QQQ Call $460 @ $50 debit
Day 7: BTC 1 QQQ Call $460 @ $60 debit
```

**Before Fix:**
- Trade 1: Matched (Credit $200, Debit $50) ✅
- Trade 2: Marked as PARTIAL ❌ (because position was removed after first close)
- Result: Incorrect partial trade warning

**After Fix:**
- Trade 1: Matched (Credit $100, Debit $50, P/L $50) ✅
- Trade 2: Matched (Credit $100, Debit $60, P/L $40) ✅
- Result: Both trades correctly matched, no partial warning
- Total P/L: $90 profit

## What You'll See Now

### Console Output:
```
Quantity split: Closing 1 of 1 contracts from position with 2 contracts
Quantity split: Closing 1 of 1 contracts from position with 1 contracts
```

### Trade Results:
- 2 separate trades created
- Each with Volume: 1
- Each with proportional credit/debit amounts
- No partial trade warnings
- Accurate P/L calculation

## Benefits

1. **Accurate Matching:** Handles any combination of opening/closing quantities
2. **Proportional P/L:** Each trade gets the correct portion of the total amounts
3. **FIFO Compliance:** Matches oldest positions first (standard accounting)
4. **No False Warnings:** Only marks trades as partial when truly unmatched
5. **Flexible:** Works with:
   - 1 open → multiple closes
   - Multiple opens → 1 close
   - Multiple opens → multiple closes
   - Any quantity combinations

## Testing

Upload your Robinhood CSV to `test-robinhood-pl.html` and verify:
- ✅ No partial trade warnings for positions you know were opened in the CSV
- ✅ Trades with same symbol/strike/expiry but different volumes are correctly split
- ✅ Total P/L matches Robinhood's reported value
- ✅ Console shows "Quantity split" messages for multi-contract positions

The bug is now fixed! Your 2-contract position will be correctly matched to both closing transactions.
