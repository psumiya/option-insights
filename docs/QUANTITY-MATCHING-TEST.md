# Quantity Matching Test Cases

## Test Case 1: Simple 1:1 Match
**Scenario:** Open 1 contract, close 1 contract

**Transactions:**
```
Day 1: STO 1 QQQ Call $460 @ $100 (receive $100)
Day 5: BTC 1 QQQ Call $460 @ $50  (pay $50)
```

**Expected Result:**
- 1 trade created
- Credit: $100
- Debit: $50
- P/L: $50 profit
- No partial trades

---

## Test Case 2: Multi-Contract Split Close (Your Bug)
**Scenario:** Open 2 contracts together, close separately

**Transactions:**
```
Day 1: STO 2 QQQ Call $460 @ $100 each = $200 total (receive $200)
Day 5: BTC 1 QQQ Call $460 @ $50 (pay $50)
Day 7: BTC 1 QQQ Call $460 @ $60 (pay $60)
```

**Expected Result:**
- 2 trades created
- Trade 1: Credit $100, Debit $50, P/L $50 profit
- Trade 2: Credit $100, Debit $60, P/L $40 profit
- Total P/L: $90 profit
- No partial trades (both closes matched to the opening position)

**Console Log Should Show:**
```
Quantity split: Closing 1 of 1 contracts from position with 2 contracts
Quantity split: Closing 1 of 1 contracts from position with 1 contracts
```

---

## Test Case 3: Multi-Contract Single Close
**Scenario:** Open 2 contracts together, close together

**Transactions:**
```
Day 1: STO 2 QQQ Call $460 @ $100 each = $200 total (receive $200)
Day 5: BTC 2 QQQ Call $460 @ $50 each = $100 total (pay $100)
```

**Expected Result:**
- 1 trade created
- Credit: $200
- Debit: $100
- P/L: $100 profit
- Volume: 2
- No partial trades

---

## Test Case 4: Multiple Opens, Multiple Closes (FIFO)
**Scenario:** Open 1 contract twice, close twice

**Transactions:**
```
Day 1: STO 1 QQQ Call $460 @ $100 (receive $100)
Day 2: STO 1 QQQ Call $460 @ $110 (receive $110)
Day 5: BTC 1 QQQ Call $460 @ $50 (pay $50)
Day 7: BTC 1 QQQ Call $460 @ $60 (pay $60)
```

**Expected Result (FIFO - First In First Out):**
- 2 trades created
- Trade 1: Credit $100 (Day 1 open), Debit $50 (Day 5 close), P/L $50 profit
- Trade 2: Credit $110 (Day 2 open), Debit $60 (Day 7 close), P/L $50 profit
- Total P/L: $100 profit
- No partial trades

---

## Test Case 5: Partial Match (Missing Opening)
**Scenario:** Close 2 contracts but only 1 opening transaction in CSV

**Transactions:**
```
Day 1: STO 1 QQQ Call $460 @ $100 (receive $100)
Day 5: BTC 1 QQQ Call $460 @ $50 (pay $50)
Day 7: BTC 1 QQQ Call $460 @ $60 (pay $60)
```

**Expected Result:**
- 2 trades created
- Trade 1: Credit $100, Debit $50, P/L $50 profit (matched)
- Trade 2: Credit $0, Debit $60, P/L -$60 loss (partial - marked with warning)
- Total P/L: -$10 (incomplete!)
- 1 partial trade

**Console Warning:**
```
Unmatched close: BTC QQQ 460 (1 of 1 contracts) - treating as partial trade
```

---

## Test Case 6: Complex Split (3 contracts → 1+2)
**Scenario:** Open 3 contracts, close as 1 then 2

**Transactions:**
```
Day 1: STO 3 QQQ Call $460 @ $100 each = $300 total (receive $300)
Day 5: BTC 1 QQQ Call $460 @ $50 (pay $50)
Day 7: BTC 2 QQQ Call $460 @ $60 each = $120 total (pay $120)
```

**Expected Result:**
- 2 trades created
- Trade 1: Credit $100, Debit $50, P/L $50 profit, Volume 1
- Trade 2: Credit $200, Debit $120, P/L $80 profit, Volume 2
- Total P/L: $130 profit
- No partial trades

---

## How to Verify

1. Open `test-robinhood-pl.html`
2. Upload your Robinhood CSV
3. Check the console for:
   - "Quantity split" messages (indicates multi-contract matching)
   - "Unmatched close" warnings (indicates partial trades)
4. Verify in the trade table:
   - Trades with same symbol/strike/expiry but different volumes
   - No ⚠️ symbols if all opens are in the CSV
5. Compare total P/L with Robinhood's reported value

## Common Patterns

### ✅ Good (No Warnings)
- All closes have matching opens
- Quantities match up correctly
- No partial trades

### ⚠️ Acceptable (With Explanation)
- Some partial trades due to CSV date range
- Console clearly explains which trades are incomplete
- You understand the P/L is incomplete

### ❌ Problem (Needs Investigation)
- Many partial trades when you know opens should be in CSV
- P/L way off from Robinhood
- Suspicious amounts or transaction types
