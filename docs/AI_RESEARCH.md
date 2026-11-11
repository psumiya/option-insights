# Recurring Options Performance Questions

Each theme is counted once per chat where it was asked, across 14 trading chats from Nov 2025 to Nov 2026. Examples are verbatim, typos included. Where a chat summary showed the question was asked but the exact wording wasn't recoverable, it is left out of the examples.

| # | Theme | Chats | Data needed | Answer type |
|---|---|---|---|---|
| 1 | Full-book diagnosis (what's working, what to change) | 5 | Transactions + YTD CSV; symbol, strategy from legs, width, contracts, DTE at entry, days held, net P/L, fees, entry/exit dates | Judgment |
| 2 | P/L over a window (last N days, week, month, month vs month) | 5 | Transactions CSV; exit date, symbol, net P/L, commissions, fees; Money Movement deposits to adjust net liq | Fixed |
| 3 | Same numbers, filtered (SPX only, without NDX, without SOFI) | 4 | Same as #2 plus underlying filter | Fixed |
| 4 | Which structures make or lose money (condor vs standalone spread, credit vs debit, bullish vs bearish) | 4 | Legs per order, strategy class, direction, width, credit/debit, max loss, net P/L | Fixed calc, judgment to read it |
| 5 | SPX 0DTE and iron condor performance by DTE bucket, width, exit timing | 4 | Underlying, DTE at entry, strategy, width, credit, max loss, entry/exit timestamps (hours held), net P/L | Fixed, except "should I widen" is judgment |
| 6 | Edge or luck | 3 | Per-trade net P/L by strategy, trade count; t-stat, bootstrap, Fisher test | Fixed test, judgment to interpret |
| 7 | Loss post-mortem and risk check (warning signs, undue risk) | 3 | Entry timestamps, trades per day, max loss per trade, concurrent open risk, re-entry after a same-day loss, direction changes, net liq | Judgment |
| 8 | Rank what worked into rules to follow | 2 | Net P/L, max loss per trade, strategy, entry time, debit size | Fixed ranking, judgment for the rules |
| 9 | Single names: stock picking vs hold time | 2 | Symbol, strategy, DTE at entry and at close, days held, net P/L, roll linkage (close and reopen within ~2 min) | Fixed buckets, judgment on "stick to SPX" |
| 10 | Charts of performance (calendar heatmap, monthly bars) | 6 | Exit date, underlying, strategy, net P/L, trade count | Fixed |
| 11 | Return vs SPY | 2 | Net liq, deposits with dates, realized + open P/L, SPY total return for the period | Fixed math, judgment on which denominator |

## Example questions

### 1. Full-book diagnosis
- "I have 3 CSVs of my options trades for year to date. Can you analyze and breakdown my trades? What am I doing well, what insights or patterns do you observe, what could help?"
- "Attached the latest transactions and YTD csv. Want to take a look and see what can help me now?"
- "What insights can you draw from this Numbers image about option trades?"

### 2. P/L over a window
- "what I need to know first is how much have I made in the last 5 and lat 10 trading days, including today."
- "Show me money made on SPX every month"
- "help me write my newsletter, ensure comparing the perf across July, August, and September."

### 3. Filtered numbers
- "What about when filtered for SPX?"
- "What if I removed NDX from the equation altogether?"
- "Excluding SOFI, how does Sep look?"

### 4. Structure-level results
- "So are you saying that condors have been profitable? And just the short put spread alone is causing negative expectancy?"
- "Has buying direction never worked for me in NDX?"

### 5. SPX 0DTE and condors
- "Can you group SPX trades according to 0, <7, and >7 classifications - then check the win/loss math on those?"
- "How have Zero DTE Iron Condors done? And is it ok to increase their width?"
- "And what's my Zero DTE SPX only performance?"

### 6. Edge or luck
- "Doesn't that feel off considering my Iron Condors and Debit Spreads are not truly statistically high probability (or something with an edge)? Have I just been lucky throughout?"
- "I am more surprised my afternoon debit spreads are making more money than condors .. that seems luck not math right?"

### 7. Loss post-mortem and risk check
- "In the past I have had you run an analysis on my options portfolio, could you check if there were any signs leading up to this debacle?"
- "Can you look at my tasty trades CSVs and let me know if the last couple of days I have taken any undue risk, and more so, if the pattern sustainable on how I traded?"

### 8. What worked, ranked
- "What would be the top 5 (or less) things be that have worked really great for me (or good enough) that I should look to follow with discipline for the rest of the year?"
- "what specifically worked the last 2 days - weigh what worked to the corresponding risk taken, rank them by risk-reward ratio."

### 9. Single names
- "it does perhaps indicate I am not very good at picking right stocks to trade, and so maybe jus stick to SPX?"
- "Oh can you show me the ones with 22 to 40 and 41 to 50, what did i trade, and if possible, what strategy"

### 10. Charts
- "Can you show me a SPX Zero DTE calendarized view, with net and average daily P/L as headers?"
- "Can you give me a monthly graph of zero dte in ndx and spx, with number of trades as also visible."
- "Given a list of my option trades, what is the best graph to understand my edge?"

### 11. Return vs SPY
- "Compare against SPY. I started with 20k usd in jan but slowly increased capital to 49k. Current net liquidity is 55,500 - so made some profit as you calculated earlier. Compare against SPY YTD"

The second SPY instance came up inside a newsletter request, so there is no standalone wording to quote.

## Takeaway

Themes 2, 3, 5, 10 and 11 are pure computation over the transactions and YTD files and belong in the options-trade-analysis skill as scripted reports. Themes 1, 7 and 8 need a model reading the output.