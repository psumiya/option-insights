---
title: Broker formats
parent: Reference
nav_order: 1
---

# Broker formats
{: .no_toc }

1. TOC
{:toc}

---

The app detects the broker from the CSV's header row and picks the matching adapter. Unknown columns are ignored, and rows that can't be parsed are skipped with a warning in the browser console.

## tastytrade

**Detected by** `Sub Type`, `Underlying Symbol` and `Call or Put` headers (or the older `Action`, `Instrument Type`, `Expiration Date` layout).

**Export** Activity → Transactions → CSV.

The richest format. It carries order numbers, fill times, commissions and fees, so every feature works: [max loss and P/L on risk]({{ '/views/trades/' | relative_url }}#max-loss-and-pl-on-risk), [time of day]({{ '/views/research/' | relative_url }}#by-time-opened-and-time-held), and net-of-fee P/L. Expirations, assignments, exercises and cash settlements are all applied; see [How P/L is calculated]({{ '/guides/pl-definitions/' | relative_url }}#expirations-assignments-and-exercises).

| tastytrade column | Used for |
|:------------------|:---------|
| Date | Entry or exit time |
| Type, Sub Type, Action | Opening vs closing, and expirations/assignments |
| Underlying Symbol | Symbol |
| Expiration Date, Strike Price, Call or Put | The contract |
| Order # | Grouping legs into one trade |
| Value, Quantity | Credit or debit, and size |
| Commissions, Fees | Subtracted from P/L |

## Robinhood

**Detected by** `Activity Date`, `Trans Code` and `Instrument` headers.

**Export** Account → Reporting and statements → Reports → Account activity → CSV.

| Robinhood column | Used for |
|:-----------------|:---------|
| Activity Date | Entry or exit date |
| Instrument | Symbol |
| Description | Contract, parsed from `SYMBOL MM/DD/YYYY Call $Strike` |
| Trans Code | STO, BTO, STC, BTC: opening vs closing and long vs short |
| Quantity | Size |
| Amount | Credit or debit, already net of fees |

Robinhood exports are date-only and carry no opening premium per leg, so time-of-day research and max loss stay blank.

## Generic format

For any other broker, build a CSV with these columns. Only `Symbol` and `Entry` are required.

| Column | Default when missing |
|:-------|:---------------------|
| Symbol | *required* |
| Entry | *required* |
| Type | Unknown |
| Strategy | Unknown |
| Strike | 0 |
| Expiry | Entry date |
| Volume | 1 |
| Delta | 0 |
| Exit | blank, meaning open |
| Debit | 0 |
| Credit | 0 |
| Account | Default |

```csv
Symbol,Type,Strategy,Strike,Expiry,Volume,Entry,Delta,Exit,Debit,Credit,Account
AAPL,Call,Long Call,150,2024-12-20,1,2024-11-01,0.5,2024-11-15,5.00,8.50,Main
```

The generic format has no fee columns, so P/L is gross of fees.

## Adding a broker

See [Adding a broker]({{ '/developers/adding-a-broker/' | relative_url }}).
