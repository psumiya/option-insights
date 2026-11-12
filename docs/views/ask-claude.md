---
title: Ask Claude
parent: Views
nav_order: 4
---

# Ask Claude

For the questions a fixed chart cannot settle: what to change, whether a pattern is an edge or luck, whether recent trading took on too much risk.
{: .fs-6 .fw-300 }

![The Ask Claude view]({{ '/assets/images/screenshots/ask-claude.png' | relative_url }})

## How to use it

1. Set the date range, status and any symbol or strategy filters you want Claude to see. The line under the buttons says exactly how many closed trades and open positions the summary will cover.
2. Pick a suggested question or write your own.
3. Click **Copy for Claude**. The summary, a short set of instructions and your question go to your clipboard, and claude.ai opens in a new tab.
4. Paste into Claude and send.

**Copy only** does the same without opening a tab. **See exactly what will be copied** shows the full text first.

## Suggested questions

| Button | Asks Claude to |
|:-------|:---------------|
| What's working | Diagnose the whole book: what's working and what to change |
| Edge or luck | Judge whether results reflect an edge or chance |
| Risk check | Look for warning signs and undue risk in recent trading |
| Rules to follow | Rank what worked into rules to keep following |
| Index vs single names | Compare index trading against single-stock trading |

## What the summary contains

Totals and breakdowns by strategy, underlying, month, days to expiration, direction and premium side, and time of day; risk measures (max loss, trades per day, same-day re-entries after a loss); the largest wins and losses; and open positions.

It never includes the CSV itself.

## Privacy

The site makes no network request. The text reaches Anthropic only when you paste it into Claude, under your own Claude account and its settings. See [Privacy and data]({{ '/reference/privacy/' | relative_url }}).
