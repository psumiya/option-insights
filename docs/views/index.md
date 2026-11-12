---
title: Views
nav_order: 3
has_children: true
permalink: /views/
---

# Views

The tabs under the header switch between four views. The date range and position status filters on the right of the same bar apply to every view except Research, which always starts from the whole account.

| View | Use it to |
|:-----|:----------|
| [Report]({{ '/views/report/' | relative_url }}) | Read your performance as a story, from headline numbers to the shape of every outcome |
| [Research]({{ '/views/research/' | relative_url }}) | Test a specific cut of closed trades and see whether the pattern is statistically real |
| [Trades]({{ '/views/trades/' | relative_url }}) | Inspect, sort and search the reconstructed trades behind every chart |
| [Ask Claude]({{ '/views/ask-claude/' | relative_url }}) | Hand a summary of your trades to Claude for questions that need judgment |

The current view lives in the URL hash (`#report`, `#research`, `#trades`, `#ask`), so a bookmark or reload reopens the same place.
