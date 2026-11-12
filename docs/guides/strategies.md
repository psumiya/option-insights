---
title: Strategy detection
parent: Guides
nav_order: 3
---

# Strategy detection

Brokers export individual legs. The app groups them into positions and names each one, so a four-leg order shows as one Iron Condor rather than four lines.

## Strategies recognized

| Strategy | Shape |
|:---------|:------|
| Long Call / Long Put | One bought option |
| Short Call / Short Put | One sold option |
| Bull Put Spread | Sold put above a bought put, for a credit |
| Bear Call Spread | Sold call below a bought call, for a credit |
| Bull Call Spread | Bought call below a sold call, for a debit |
| Bear Put Spread | Bought put above a sold put, for a debit |
| Iron Condor | A put credit spread and a call credit spread together |
| Strangle | A call and a put at different strikes, same side |
| Straddle | A call and a put at the same strike, same side |
| Butterfly | Three strikes, the middle traded twice |
| Long Stock / Short Stock | Shares, including those delivered by assignment |
| Custom | Legs that match no named shape |
| Opened before this export | Only the closing side is in the file |

Research groups these further into **direction** (bullish, bearish, neutral) and **premium side** (credit or debit).

## How legs are grouped

**tastytrade.** Legs are grouped by order number, then matched as FIFO lots keyed on contract and opening order. Selling the same strike in two orders opens two positions. One closing row can retire lots from several orders, in which case its value and fees are split proportionally.

**Robinhood.** Legs opened together are rolled into one trade per strategy, and positions are closed on expiration when no closing transaction exists.

## Derived fields

Computed while grouping legs, not read from the CSV:

| Field | Derivation |
|:------|:-----------|
| Width | Strike difference for a vertical; the wider wing for an iron condor |
| Expiry | Nearest expiration across the opening legs |
| DTE at entry | Calendar days from entry to nearest expiration, so a same-day entry reads 0 |
| Open credit | Credit taken in on opening legs only |
| Fees | Summed across all legs |
