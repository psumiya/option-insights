---
title: Trades
parent: Views
nav_order: 4
---

# Trades

The reconstructed trades every chart is computed from, narrowed by the same filters as the report.
{: .fs-6 .fw-300 }

![The Trades view]({{ '/assets/images/screenshots/trades.png' | relative_url }})

## Columns

| Column | Meaning |
|:-------|:--------|
| Symbol | The underlying |
| Strategy | The detected structure; see [Strategy detection]({{ '/guides/strategies/' | relative_url }}) |
| Entry / Exit | Open and close dates; Exit is blank while a position is open |
| Days held | Calendar days from entry to exit |
| Credit / Debit | Premium taken in and paid out across all legs |
| Fees | Commissions plus fees, as a positive cost |
| Realized P/L | Net of fees, for closed legs |
| Max loss | What the trade could have lost at open |
| P/L on risk | Realized P/L as a share of max loss |

Click a column header to sort. The search box matches symbol or strategy. The summary line above the table totals realized P/L the same way the Snapshot figure does, so the two always agree. Clicking a symbol or strategy [filters]({{ '/guides/filtering/' | relative_url }}#click-to-filter) the whole app to it.

## Max loss and P/L on risk

**Max loss** is what a trade could have lost at open, before fees:

- the width less the credit for a credit spread or iron condor
- the debit paid for anything bought

**P/L on risk** is realized P/L divided by max loss. Sorting this column ranks trades by return for the risk taken, which is often a better guide than raw P/L.

{: .note }
Both need the opening premium, which only tastytrade exports carry. They stay blank for naked short options, strangles or straddles sold for credit (where the loss is undefined), and futures options.
