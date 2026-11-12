---
title: Report
parent: Views
nav_order: 1
---

# Report
{: .no_toc }

One scrolling page in five chapters, each headed by the question it answers.
{: .fs-6 .fw-300 }

1. TOC
{:toc}

---

## Navigating the report

A rail on the left tracks the chapter you are reading and shows a figure for each: realized P/L, how many symbols, how many strategies, how many months, and the win rate. Click a chapter to jump to it. On a narrow screen the rail becomes a strip of chips along the top.

![The report on a phone, with the chapter rail as chips]({{ '/assets/images/screenshots/mobile-report.png' | relative_url }}){: style="max-width: 360px" }

Charts draw when they scroll into view, so a large export stays responsive. The chapter you are reading is kept in the URL (for example `#report/timing`).

## Snapshot

*How am I doing overall?*

![The Snapshot chapter]({{ '/assets/images/screenshots/report-snapshot.png' | relative_url }})

**Headlines.** Up to four generated sentences: where losses concentrate, your best underlying, your weakest strategy, and the strategy that wins most often. Each headline is a shortcut: click it to filter the whole app to what it names.

**Key metrics.** Total trades, win rate, realized P/L (with a count of positions still open) and average win. Realized P/L is defined in [How P/L is calculated]({{ '/guides/pl-definitions/' | relative_url }}).

**P/L trend.** Cumulative P/L over the selected date range.

## Where the P/L came from

*Which underlyings drove the result, and how did trades flow into wins and losses?*

![The Where the P/L came from chapter: waterfall and trade flow]({{ '/assets/images/screenshots/report-sources.png' | relative_url }})

**P/L attribution by symbol.** A waterfall where each step is one underlying's contribution to the total, ending at a total bar. The **Show** menu limits it to the top contributors.

**Trade flow.** A Sankey diagram from symbol, through strategy, to win or loss, weighted by trade count. Thick bands show where most of your activity goes; the colors on the right show how it ends.

Click any symbol or strategy in either chart to [filter]({{ '/guides/filtering/' | relative_url }}#click-to-filter) the report to it.

## Strategies

*Which strategies work, and on what?*

![The Strategies chapter]({{ '/assets/images/screenshots/report-strategies.png' | relative_url }})

- **Win rate and P/L by strategy**, side by side, so a high win rate with a negative total stands out.
- **Win rate against average win**, a bubble chart where bubble size is trade count. Strategies up and to the right win often and win big.
- **P/L by symbol and strategy**, a table with a **Net / Gross** toggle. Net is what each closed position returned after costs. Gross counts every retired leg before costs, which matches the P/L column of a broker statement, so use it to reconcile.

## Timing

*When do I make and lose money?*

![The Timing chapter]({{ '/assets/images/screenshots/report-timing.png' | relative_url }})

- **Daily P/L calendar**, a heatmap of every trading day.
- **Net P/L by month**, with a per-strategy breakdown on hover.
- **P/L against days held or DTE at entry**, a scatter plot with a toggle between the two, for spotting whether short-dated or long-held trades behave differently.

## Outcome shape

*What do my wins and losses look like?*

![The Outcome shape chapter]({{ '/assets/images/screenshots/report-outcomes.png' | relative_url }})

- **Wins against losses**, a donut of the win/loss split.
- **P/L histogram** of every closed trade, with the average win and average loss marked. A long left tail means a few large losses are eating many small wins.

## Collapsed extras

Two sparser charts sit collapsed at the end of the report. Click a heading to expand it; the app remembers whether each was open.

- **Long-term trends**: daily cumulative P/L.
- **Cost basis by symbol**: total debits paid per underlying.
