---
title: SPX 0DTE
parent: Views
nav_order: 3
---

# SPX 0DTE
{: .no_toc }

Same-day SPX trades lined up against how far SPX moved that day and how far the short strikes sat from the open.
{: .fs-6 .fw-300 }

1. TOC
{:toc}

---

This view needs a tastytrade transactions export, because it relies on the time of each fill and the strike and expiration of every leg. Other formats leave it empty.

## Which trades count

A trade is 0DTE when an SPX option position is opened on its expiration day, in Eastern time. Positions opened on an earlier day are left out, including ones opened the evening before in the overnight session.

Closes are matched to opening lots first in, first out across every SPX lot, so a close is never credited to the wrong position. Legs opened together are grouped into one position and named from their strikes: iron condor, put or call credit spread, butterfly, short put and so on. P/L includes fees and cash settlement.

Each position gets one of four outcomes: **Expired** worthless, **Settled ITM** in cash, **Closed early**, or **Open**.

## Data freshness

A banner at the top says the last day the cached SPX data covers and whether it is current. If the cache is behind, trades on the missing days are counted as waiting for data and left out of every number until the bars arrive. See [Market data](#market-data).

## Headline

Trades, trading days, net P/L and win rate for the trades in view, with a sentence summarizing the best and worst day types and strike distances. Every filter on the page narrows these numbers.

## Results by day type

Each row is a bucket of how far SPX moved that day, in each direction:

| Bucket | Size of move |
|:-------|:-------------|
| Under 0.3% | The quietest days |
| 0.3–0.5% | |
| 0.5–0.6% | |
| 0.6–1% | |
| 1–1.5% | |
| Over 1.5% | The largest moves |

Rows show trades and days, win rate and net P/L.

Two toggles change how the move is read:

- **Day move measure**: **Open → close** measures the session alone. **Prior close → close** includes the overnight gap.
- **Entry time**: any entry, entries before 11:00 ET, or entries at 11:00 ET or later.

Tap a row to filter the rest of the page to that day type. Tap it again to clear it.

## Short strike vs. open

How far each short strike sat from the day's open, as a share of the open, for **Short puts** or **Short calls**:

| Band | Meaning |
|:-----|:--------|
| Wrong side of open | The strike was already in the money at the open |
| 0–0.25% through ≥1% | Out of the money by that much |

Each band shows:

- **Hit %**: the share of trades where the day's range reached the strike
- **ITM at close**: the share where SPX finished beyond it
- win rate and net P/L

Tap a row to filter the page to that band.

{: .warning }
Distances use the day's open, because the export doesn't record SPX at the moment of entry. For afternoon entries the open can be far from where SPX actually was.

## Day explorer

A list of every trading day in view, with its move and VIX close. Pick a day to see:

- the day's SPX open, high, low and close, with VIX open and close and its change from the prior close
- a price ladder drawing the day's range against each position's strikes
- the trades that day, with entry time, structure, legs, outcome and P/L

**Prev** and **Next** step through the days.

The **Structure** and **Outcome** menus above the list take several values at once. Each selection appears as a chip with the others at the top of the page; remove a chip to drop that filter.

## Market data

SPX daily bars (open, high, low, close) and VIX open and close come from Yahoo Finance and are cached with the site as JSON in `data/`. The browser loads only those files, so your trades never leave the page.

A scheduled job in the Pages workflow refreshes them each weekday after the close. It checks the bars against the NYSE calendar and commits any new days. If a day has no published bar, the footer of the view lists it as left out. To refresh by hand, see [Local development]({{ '/developers/local-development/' | relative_url }}#market-data).

VIX is shown for context only. It doesn't change which trades count or how they're bucketed.
