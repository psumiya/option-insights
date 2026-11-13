---
title: Getting started
nav_order: 2
has_children: true
permalink: /getting-started/
---

# Getting started

Option Insights needs nothing installed. Open the [hosted app](https://psumiya.github.io/option-insights/), or [run it locally]({{ '/developers/local-development/' | relative_url }}), and you land on the welcome screen.

![The welcome screen before any data is loaded]({{ '/assets/images/screenshots/welcome.png' | relative_url }})

From here you have two paths:

- **Try Demo Data** loads 100 generated trades so you can explore every view without exporting anything. See [Demo data]({{ '/getting-started/demo-data/' | relative_url }}).
- **Upload CSV** reads an export from your broker. See [Uploading your trades]({{ '/getting-started/uploading-trades/' | relative_url }}).

Once trades are loaded, the header shows **Upload CSV**, **Demo** and **Clear**, and the app opens on the [Report]({{ '/views/report/' | relative_url }}). Your trades stay in this browser until you press **Clear** or clear site data.

## Requirements

A current desktop or mobile browser with JavaScript and `localStorage` enabled. Private or incognito windows work, but the data is forgotten when the window closes.
