---
title: Home
layout: home
nav_order: 1
description: Option Insights turns a broker CSV export into a report on your options trading, entirely in your browser.
permalink: /
---

# Option Insights
{: .fs-9 }

Turn a broker CSV export into a clear report on your options trading. Everything runs in your browser: no account, no server, no tracking.
{: .fs-6 .fw-300 }

[Open the app](https://psumiya.github.io/option-insights/){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 target="_blank" rel="noopener" }
[Get started]({{ '/getting-started/' | relative_url }}){: .btn .fs-5 .mb-4 .mb-md-0 }

---

![The Report view, opened on the Snapshot chapter]({{ '/assets/images/screenshots/report-overview.png' | relative_url }})

## What it does

Option Insights reads the transaction history you export from Robinhood or tastytrade, rebuilds each multi-leg position into a single trade, and answers the questions a statement can't: where the P/L came from, which strategies work, when you trade best, and whether a pattern is an edge or luck.

The app has four views, sharing one filter bar.

| View | Answers | Page |
|:-----|:--------|:-----|
| **Report** | How am I doing, and why? Five chapters, from headline numbers to the shape of every outcome. | [Report]({{ '/views/report/' | relative_url }}) |
| **Research** | Which choices drove the result, and does the pattern survive a small-sample check? | [Research]({{ '/views/research/' | relative_url }}) |
| **Trades** | The reconstructed trades behind every chart, with max loss and return on risk. | [Trades]({{ '/views/trades/' | relative_url }}) |
| **Ask Claude** | Questions a fixed chart can't settle, handed to Claude with a summary of your trades. | [Ask Claude]({{ '/views/ask-claude/' | relative_url }}) |

## Private by design

Your CSV is parsed in the page and kept in your browser's `localStorage`. The site makes no network requests with your data, sets no cookies and runs no analytics. The Ask Claude view only copies a summary to your clipboard; it reaches Anthropic only if you paste it into Claude yourself. See [Privacy and data]({{ '/reference/privacy/' | relative_url }}).

## Where to go next

- New here? Start with [Getting started]({{ '/getting-started/' | relative_url }}).
- Numbers don't match your broker? Read [How P/L is calculated]({{ '/guides/pl-definitions/' | relative_url }}).
- Want to narrow the report to one symbol or strategy? See [Filtering]({{ '/guides/filtering/' | relative_url }}).
- Running it yourself or contributing? See [Developers]({{ '/developers/' | relative_url }}).
