---
title: Filtering
parent: Guides
nav_order: 1
---

# Filtering
{: .no_toc }

1. TOC
{:toc}

---

Filters sit in the bar under the header and apply to the Report, Trades and Ask Claude views. [Research]({{ '/views/research/' | relative_url }}) has its own filter bar and always starts from the whole account.

## Date range

| Button | Window |
|:-------|:-------|
| 5D | Last 5 trading days, today included |
| 10D | Last 10 trading days, today included |
| 1W | Last 7 calendar days |
| 1M | Last 30 days |
| 1Y | Last 12 months |
| YTD | Year to date |
| All | Every trade in the export |

Weekdays stand in for trading days, so a market holiday stretches the 5D and 10D windows by a day.

## Position status

**Closed**, **Open** or **All** positions. A strategy only counts as closed once every one of its legs is gone.

## Click to filter

Clicking a symbol or strategy filters the whole app to it. This works in the waterfall, trade flow, cost basis, strategy charts and bubble chart, in either table, and on each Snapshot headline. The filter shows as a removable chip under the tabs.

![The report filtered to SPX]({{ '/assets/images/screenshots/filter-include.png' | relative_url }})

- Picking several values in one dimension shows **any** of them (SPX or NDX).
- Picks in different dimensions **narrow together** (SPX and Iron Condor).
- **×** on a chip removes it.

### Excluding instead of including

Click a chip's name to flip it from "only this" to "everything except this". An excluded chip reads **Not symbol** (or **Not strategy**) with a dashed border. Click the name again to flip it back.

![The report with NDX excluded]({{ '/assets/images/screenshots/filter-exclude.png' | relative_url }})

This answers questions like "how does my book look without NDX?" in two clicks: click NDX in any chart, then click its chip.

## Filters in the URL

The current view, chapter and filters live in the URL hash, for example:

```
#report/strategies?symbol=SPX&not-strategy=Bull%20Put%20Spread
```

A bookmark or reload reopens the same view. The parameters are `symbol`, `strategy`, `not-symbol`, `not-strategy`, `range` and `status`.

Symbol and strategy picks are kept only in the URL, never in storage, so a new upload never opens already filtered. Date range and status are remembered between visits.
