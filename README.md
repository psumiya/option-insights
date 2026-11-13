# Option Insights

A personal options trading dashboard that turns a broker CSV export into a report on
what worked, what didn't, and why.

Your trades. Your browser. Your insights. No tracking or cookies.

**[Try it](https://psumiya.github.io/option-insights/)** · **[Documentation](https://psumiya.github.io/option-insights/docs/)**

![Trade Flow chart from the demo data: symbols flow into strategies, then into wins and losses](docs/assets/images/screenshots/trade-flow.png)

## Quick Start

Open the app and click **Demo** to explore 100 sample trades, or **Upload CSV** to load
your own export. Robinhood and TastyTrade formats are detected automatically, and a
generic CSV with basic trade columns also works. See
[Broker Support](docs/BROKER_SUPPORT.md) for the formats.

The app has four views. **Report** walks through your P/L by symbol, strategy, timing
and outcome, and clicking any chart filters the whole app. **Trades** lists the
reconstructed trades behind every chart. **Research** checks whether a pattern is an
edge or luck. **Ask Claude** copies a summary of your trades for you to paste into
Claude. The [documentation](https://psumiya.github.io/option-insights/docs/) covers each
view, the filters and how P/L is calculated.

## Privacy

Everything runs in your browser. Your CSV is never uploaded, data is kept in
localStorage, and the site makes no network requests or analytics calls. Ask Claude
only copies text to your clipboard; it reaches Anthropic only if you paste it yourself.

## Local Development

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Tests run on Node 18 or later with no install:

```bash
node --test tests/*.test.js
```

See [TESTING.md](docs/TESTING.md) for the older browser test pages.

## License

See [LICENSE](LICENSE).
