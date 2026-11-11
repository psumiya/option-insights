# Option Insights

A personal options trading insights dashboard that helps you visualize and analyze your trading performance.

Your trades. Your browser. Your insights. No Tracking or Cookies.

Try it here: https://sumiya.page/insights/index.html

Or build locally as described below.

## Quick Start

### Option 1: Try Demo Data 

1. Open `index.html` in your browser
2. Click **Try Demo Data** (or **Demo** in the header)
3. Explore the report with 100 sample trades

### Option 2: Upload Your Own Data

1. Open `index.html` in your browser
2. Click **"Upload CSV"** button
3. Select your trading data CSV file
4. Read the report built from your trades

## Supported Brokers

The application automatically detects and adapts to CSV formats from:
- **Robinhood** - Full support for Robinhood export format
- **Tasty Trade** - Full support for Tasty Trade export format
- **Generic** - Works with any CSV containing basic trade data

See [BROKER_SUPPORT.md](docs/BROKER_SUPPORT.md) for detailed format specifications.

## Layout

The app has three views: **Report**, **Research** and **Trades**. The date range and
position status filters sit in a bar under them and apply to all three.

### Report

One scrolling page in five chapters, each headed by the question it answers. A rail
on the left tracks the chapter you are reading and shows a figure for each; on a
narrow screen it becomes a strip of chips along the top.

- **Snapshot** - Up to four generated headlines (where losses concentrate, best
  underlying, weakest and most reliable strategy), the key metrics, and the P/L trend
- **Where the P/L came from** - P/L attribution by symbol (waterfall) and trade
  flow from symbol through strategy to outcome (Sankey)
- **Strategies** - Win rate and P/L by strategy, win rate against average win
  (bubble size is trade count), and a P/L by symbol and strategy table
- **Timing** - Daily P/L calendar, net P/L by month with a per-strategy breakdown
  on hover, and P/L against days held or DTE at entry
- **Outcome shape** - Wins against losses, and a histogram of every closed trade's
  P/L with the average win and loss marked

Two sparser charts sit collapsed at the end: **Long-term Trends** (daily cumulative
P/L) and **Cost Basis by Symbol** (total debits paid per underlying).

Charts draw when they scroll into view.

### Click to filter

Clicking a symbol or strategy in the waterfall, trade flow, cost basis, strategy
charts, bubble chart or either table filters the whole app to it, shown as a
removable chip in the filter bar. Picking several values in one dimension shows any
of them; picks in different dimensions narrow together. Each Snapshot headline
applies its own filter when clicked.

Clicking a chip's name flips it from "only this" to "everything except this", so
picking NDX and flipping its chip shows the book without NDX. An excluded chip reads
"Not symbol" with a dashed border; clicking its name flips it back, and × removes it.

The current view, chapter and filters live in the URL, so a link or a reload reopens
the same view. Symbol and strategy picks are kept only there, never in storage, so a
new upload never opens already filtered.

### Trades

The reconstructed trades every chart is computed from, narrowed by the same filters
as the report: symbol, strategy, entry and exit dates, days held, credit, debit, fees
and realized P/L. Columns sort, a search box matches symbol or strategy, and the
summary line totals realized P/L the same way the Snapshot figure does.

**Max loss** is what a trade could have lost at open, before fees: width less credit
for a credit spread or iron condor, the debit paid for anything bought. **P/L on risk**
is realized P/L as a share of it, so sorting that column ranks trades by return for
the risk taken. Both need the opening premium, which only TastyTrade exports carry,
and stay blank for naked short options, strangles or straddles sold for credit, and
futures options.

### Research
Structural analysis of closed trades: which choices drove the result, and whether
the pattern survives a small-sample check.

- **Presets** - One click applies a saved cut (underlying, DTE, structures)
- **Filter bar** - Underlying, days-to-expiration cut, and structure selection;
  **All strategies** drops the structure filter and includes every strategy
- **Trade by trade** - One bar per closed trade, with net, average and count above
- **Calendar** - Net P/L per trading date, cells labelled by structure
- **By days to expiration** - Win rate and expectancy split 0DTE / 1-7DTE / >7DTE
- **Condor vs single-sided** - Iron condors against one-sided credit spreads
- **Direction and credit vs debit** - Bullish, bearish and neutral trades, sold
  against bought premium, and the two crossed for directional trades. Read from
  the strategy name; trades it cannot place are listed rather than guessed
- **By spread width** - Performance and average credit collected per width bucket
  ($5-wide, $10-wide, $20-wide, other)
- **Uniform-width counterfactual** - What the same trades would have netted at one
  spread width, against what they actually netted
- **Edge check** - Whether the average P/L per trade, for the cut and each strategy
  in it, clears zero by more than luck would produce (bootstrap range and t-statistic,
  no verdict under 10 trades)
- **Streak check** - Whether wins and losses cluster more than chance predicts
- **Loss concentration** - Share of total losses carried by the largest few

Every output states which cut it shows and how many trades back it. Statistics that
a sample is too small to support say so rather than showing a number.

Adding a cut is an edit to `RESEARCH_PRESETS` in `js/research-scenarios.js`.

## P/L Definition

P/L is **net of commissions and fees** wherever the broker export provides them.
TastyTrade exports do; Robinhood's `Amount` column is already net; the generic
format has no fee columns, in which case the Research view says P/L is gross of fees.

The `P/L by Symbol & Strategy` table in the Strategies chapter has a **Net / Gross**
toggle. Net is what each closed position returned after costs. Gross counts every
retired leg before costs, which is the measure that matches the P/L column of a
broker statement, so use it to reconcile.

The headline figure is **Realized P/L**, which counts every retired leg, and the
Trades view totals the same way. Brokers
settle leg by leg, so half of a strangle can be realized while the position is
still open. This is the figure that ties to a broker statement; individual trades
stay grouped by strategy, and a strategy is only marked closed once every one of
its legs is gone.

Two things cannot be reconciled from a transaction export alone, and the app says
so rather than guessing:

- **Positions opened before the export window.** Only the closing side is known,
  so their P/L is understated. Re-export covering the opening dates to fix.
- **Positions spanning a year boundary.** TastyTrade's year-to-date report carries
  the prior year-end *mark* as cost basis; the app computes P/L from entry to exit.

## Filters

- **Date Range**: Last 5 or 10 trading days (today included; weekdays stand in
  for trading days, so a market holiday stretches the window by a day), last 7
  days, 30 days, 12 months, Year To Date, All time
- **Position Status**: Open, Closed, or All positions
- **Symbol and Strategy**: set by clicking a chart, a table row or a headline

## Local Development

1. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```

2. Open in browser:
   ```
   http://localhost:8000
   ```

3. Load demo data or upload your CSV

## Testing

The analytics, research, tastytrade reconstruction, headline and histogram logic is
covered by Node tests, with no install needed (Node 18 or later):

```bash
node --test tests/*.test.js
```

Older browser test pages remain under `tests/` and run against a local server, for
example `http://localhost:8000/tests/test-broker-adapters.html`. See
[TESTING.md](docs/TESTING.md) for those.

## Privacy & Security

- **100% Client-Side** - All processing happens in your browser
- **No Server Required** - Your data never leaves your computer
- **Local Storage Only** - Data is saved in your browser's localStorage
- **No Analytics** - No tracking or data collection using cookies or any other means
- **Open Source** - Review the code yourself

Requires JavaScript enabled and localStorage support.

## License

See [LICENSE](LICENSE) file for details.

## Contributing

This is a personal project, but suggestions and improvements are welcome!

**Made with ❤️ for retail options traders.**
