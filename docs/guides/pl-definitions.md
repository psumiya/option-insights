---
title: How P/L is calculated
parent: Guides
nav_order: 2
---

# How P/L is calculated
{: .no_toc }

1. TOC
{:toc}

---

## Net of fees

P/L is net of commissions and fees wherever the export provides them.

| Source | Fees |
|:-------|:-----|
| tastytrade | Commissions and fees columns are subtracted |
| Robinhood | The `Amount` column is already net |
| Generic | No fee columns, so P/L is gross; Research says so |

## Realized P/L

The headline figure in the Snapshot is **Realized P/L**, which counts every retired leg. Brokers settle leg by leg, so half of a strangle can be realized while the position is still open. This is the figure that ties to a broker statement, and the [Trades]({{ '/views/trades/' | relative_url }}) summary totals the same way.

Individual trades stay grouped by strategy, and a strategy is only marked closed once every one of its legs is gone.

## Net vs gross

The **P/L by Symbol & Strategy** table in the [Strategies chapter]({{ '/views/report/' | relative_url }}#strategies) has a **Net / Gross** toggle.

- **Net** is what each closed position returned after costs.
- **Gross** counts every retired leg before costs. It matches the P/L column of a broker statement, so use it to reconcile.

## Expirations, assignments and exercises

tastytrade records more than trades in its history. These rows close positions too:

| Row | Effect |
|:----|:-------|
| Expiration | Closes the contract at zero |
| Assignment / Exercise | Removes the contract; the side is inferred from the open position |
| Cash settled assignment / exercise | Index settlement; carries the cash |
| Shares delivered by assignment | Tracked as their own stock position |

Robinhood legs that expire are closed on their expiration date.

## What an export cannot reconcile

Two cases cannot be settled from a transaction export alone. The app says so rather than guessing.

**Positions opened before the export window.** Only the closing side is known, so their P/L is understated. Research shows a banner counting them. Re-export covering the opening dates to fix.

**Positions spanning a year boundary.** tastytrade's year-to-date report carries the prior year-end *mark* as cost basis, while the app computes P/L from entry to exit, so the two will differ for those positions.
