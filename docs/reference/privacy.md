---
title: Privacy and data
parent: Reference
nav_order: 2
---

# Privacy and data

Your trades. Your browser. Your insights.
{: .fs-6 .fw-300 }

## What happens to your CSV

The file is read inside the page and never uploaded. There is no server-side code: the hosted app is a set of static files, and all parsing, grouping and charting runs in your browser.

## What is stored, and where

Everything is kept in this browser's `localStorage`, on this device only.

| Stored | Why |
|:-------|:----|
| Reconstructed trades | So a reload reopens your report |
| Date range and status filter | So your usual view is remembered |
| Theme choice | Light or dark |
| Collapsed sections | Which extras you left open |

Symbol and strategy filters are kept only in the URL. **Clear** in the header removes your trades. Clearing site data for the app removes everything.

## What never happens

- No cookies
- No analytics or tracking of any kind
- No network requests carrying your data. The only files the app fetches are its own cached SPX and VIX bars, for the [SPX 0DTE]({{ '/views/spx-0dte/' | relative_url }}) view.

## Ask Claude

The [Ask Claude]({{ '/views/ask-claude/' | relative_url }}) view puts a summary on your clipboard and, if you choose, opens claude.ai in a new tab. Nothing is sent by the app. The summary reaches Anthropic only if you paste it into Claude, under your own account. It holds totals, breakdowns and your largest trades, never the CSV. Use **See exactly what will be copied** to review it first.

## Verify it yourself

The app is [open source](https://github.com/psumiya/option-insights). Open your browser's developer tools on the Network tab while you upload a file, and you will see no request carrying it.
