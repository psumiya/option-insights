---
title: Demo data
parent: Getting started
nav_order: 1
---

# Demo data

Click **Try Demo Data** on the welcome screen, or **Demo** in the header, to load 100 generated trades across a mix of symbols and strategies. The demo replaces whatever is loaded, so use it before uploading your own file or after pressing **Clear**.

Alongside them, the demo adds about 70 SPX 0DTE trades spread over 40 recent trading days, so the [SPX 0DTE]({{ '/views/spx-0dte/' | relative_url }}) view has something to show. Each one is laid against the real SPX open, high, low and close for its day, uses the structure mix, wing widths, entry times and fees of a real 0DTE account, and is written as tastytrade transaction rows, so it goes through the same parsing as an uploaded export. The prices come from a simple model, so treat the P&L as illustrative.

Demo trades exercise every chart in the [Report]({{ '/views/report/' | relative_url }}) and the [Trades]({{ '/views/trades/' | relative_url }}) table. A few [Research]({{ '/views/research/' | relative_url }}) outputs depend on fields only real tastytrade exports carry, such as the time of day an order filled, so expect some of them to say the data is missing.

{: .tip }
Demo data is the quickest way to learn [click to filter]({{ '/guides/filtering/' | relative_url }}#click-to-filter) without worrying about your own numbers.
