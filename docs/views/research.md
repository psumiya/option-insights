---
title: Research
parent: Views
nav_order: 2
---

# Research
{: .no_toc }

Structural analysis of closed trades: which choices drove the result, and whether the pattern survives a small-sample check.
{: .fs-6 .fw-300 }

1. TOC
{:toc}

---

![The Research view: presets, the filter bar and the first output]({{ '/assets/images/screenshots/research-top.png' | relative_url }})

Research always starts from the whole account and ignores the report's date and status filters. It analyzes **closed trades only**, because open positions have no realized outcome yet.

Every output states which cut it shows and how many trades back it. Where a sample is too small to support a statistic, the output says so instead of showing a number.

## Choosing a cut

### Presets

One click applies a saved cut of underlying, days to expiration and structures, and jumps to the output it was built for. Presets marked with an underlying use your most-traded one (SPX in the screenshot).

| Preset | Focus |
|:-------|:------|
| Whole account by days to expiration | DTE buckets |
| Whole account edge check | Edge check |
| Whole account by direction and credit vs debit | Direction split |
| *Top underlying* 0DTE by time opened | Time of day |
| Whole account loss concentration | Loss concentration |
| *Top underlying* 0DTE, condors vs single-sided | Calendar |
| *Top underlying* 0DTE iron condors only | Trade by trade |
| *Top underlying* iron condors, excluding 0DTE | Trade by trade |
| *Top underlying* by days to expiration | DTE buckets |
| *Top underlying* condor vs single-sided, all DTE | Condor vs single-sided |
| *Top underlying* put credit spread by width | Spread width |
| *Top underlying* put credit spread, uniform width | Counterfactual |
| *Top underlying* streak check | Streak check |
| *Top underlying* loss concentration | Loss concentration |

To add your own, see [Adding a research preset]({{ '/developers/research-presets/' | relative_url }}).

### Filter bar

- **Underlying**: one symbol, or all underlyings (the count of closed trades is shown).
- **Days to expiration**: All, 0DTE, or Over 0DTE.
- **Structures**: Iron Condor, Put Credit Spread, Call Credit Spread, in any combination. **All strategies** drops the structure filter and includes every strategy, not just these three.

A banner warns when trades in the cut were opened before the export began, since their P/L is understated.

## Outputs

Each output is a collapsible section. Trade by trade and Calendar open by default; click any other heading to expand it, or pick a preset, which opens and scrolls to its section.

![The Research view for the whole account]({{ '/assets/images/screenshots/research-full.png' | relative_url }})

### Trade by trade
One bar per closed trade in date order, with net P/L, average P/L per trade and trade count above.

### Calendar by entry date
Net P/L per trading date, each cell labelled by the structures traded that day.

### By days to expiration
Win rate and expectancy split into **0DTE**, **1–7 DTE** and **over 7 DTE**.

### Condor vs single-sided
Iron condors against one-sided credit spreads on the same underlying.

### Direction and credit vs debit
Bullish, bearish and neutral trades; sold premium against bought premium; and the two crossed for directional trades. Direction is read from the strategy name. Trades it cannot place are listed rather than guessed.

### By time opened and time held
Results by the New York time a trade was opened (open, morning, midday, afternoon, outside hours), split again into credit and debit, and by how long it was held, from under an hour to over a week.

{: .note }
This needs times of day. tastytrade exports carry them; date-only exports such as Robinhood's do not.

### By spread width
Performance and average credit collected per width bucket: $5-wide, $10-wide, $20-wide and other.

### Uniform-width counterfactual
What the same trades would have netted at one spread width, against what they actually netted. Useful for asking "should I have traded these wider or narrower?"

### Edge check
Whether the average P/L per trade, for the cut and each strategy in it, clears zero by more than luck would produce. Shows a bootstrap range and a t-statistic. No verdict is given under 10 trades.

### Streak check
Whether wins and losses cluster into streaks more than chance predicts, which can point to tilt or regime changes.

### Loss concentration
The share of total losses carried by the largest few losing trades. A high share means risk control on a handful of trades matters more than anything else.

## P/L basis

Research P/L is net of commissions and fees wherever the export provides them. The generic format has no fee columns; in that case the view says P/L is gross of fees. See [How P/L is calculated]({{ '/guides/pl-definitions/' | relative_url }}).
