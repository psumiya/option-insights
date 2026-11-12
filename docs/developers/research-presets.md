---
title: Adding a research preset
parent: Developers
nav_order: 4
---

# Adding a research preset

[Research]({{ '/views/research/' | relative_url }}) presets are entries in `RESEARCH_PRESETS` in `js/research-scenarios.js`:

```javascript
{
  id: 'top_0dte_condor_only',
  title: '{underlying} 0DTE iron condors only',
  filter: {
    underlying: RESEARCH_TOP_UNDERLYING,
    dteCut: 'zero',
    structures: ['iron_condor']
  },
  focus: 'calendar'
}
```

| Field | Meaning |
|:------|:--------|
| `id` | Unique key |
| `title` | Button label; `{underlying}` is replaced by the chosen symbol |
| `filter.underlying` | A symbol, `null` for all, or `RESEARCH_TOP_UNDERLYING` for the most-traded one |
| `filter.dteCut` | `'all'`, `'zero'` (0DTE) or `'nonzero'` (over 0DTE) |
| `filter.structures` | `null` for all strategies, or a list such as `['iron_condor']` |
| `focus` | The output section to scroll to, such as `'edge-check'` or `'dte-buckets'`, which opens it |

The valid `focus` values are the section ids in `RESEARCH_SECTIONS` in the same file. Add a case to `tests/research-scenarios.test.js` when you add a preset.
