---
title: Local development
parent: Developers
nav_order: 1
---

# Local development

Clone the repository and serve it with any static server:

```bash
git clone https://github.com/psumiya/option-insights.git
cd option-insights
python3 -m http.server 8000
```

Open `http://localhost:8000`, then load demo data or upload a CSV.

A server is needed rather than opening `index.html` from disk, because browsers restrict some features on `file://` pages.

## Your own CSVs

`tests/sample-data/` ignores every `*.csv` except the committed samples, so you can drop your own exports there for local testing without risk of committing them.

## Working on this documentation

The site lives in `docs/` and is built by GitHub Pages with the [Just the Docs](https://just-the-docs.com) theme. To preview it locally you need Ruby and Bundler:

```bash
cd docs
bundle init
bundle add jekyll just-the-docs jekyll-remote-theme
bundle exec jekyll serve
```

Screenshots are under `docs/assets/images/screenshots/`.
