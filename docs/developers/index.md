---
title: Developers
nav_order: 6
has_children: true
permalink: /developers/
---

# Developers

Option Insights is plain HTML, CSS and JavaScript with no build step. D3 draws the charts and Tailwind styles the page, both vendored under `lib/`.

| Path | Contents |
|:-----|:---------|
| `index.html` | The whole app shell |
| `js/broker-adapters.js` | Broker detection and CSV-to-trade conversion |
| `js/strategy-detector.js`, `js/tasty-strategy-mapper.js` | Naming multi-leg positions |
| `js/analytics-engine.js` | Metrics behind the report |
| `js/research-*.js` | The Research view: presets, analytics, outputs |
| `js/ai-context.js`, `js/ai-panel.js` | The Ask Claude summary and view |
| `js/visualizations/` | One file per chart |
| `tests/` | Node tests and older browser test pages |

- [Local development]({{ '/developers/local-development/' | relative_url }})
- [Testing]({{ '/developers/testing/' | relative_url }})
- [Adding a broker]({{ '/developers/adding-a-broker/' | relative_url }})
- [Adding a research preset]({{ '/developers/research-presets/' | relative_url }})
