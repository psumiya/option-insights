---
title: Testing
parent: Developers
nav_order: 2
---

# Testing

## Node tests

The analytics, research, tastytrade reconstruction, Robinhood strategy, headline, filter, max loss and histogram logic is covered by Node's built-in test runner. No install is needed (Node 18 or later):

```bash
node --test tests/*.test.js
```

## Browser test pages

Older test pages under `tests/` run against a local server. Start one with `python3 -m http.server 8000` and open, for example:

- `http://localhost:8000/tests/automated-test.html`, the full browser suite
- `http://localhost:8000/tests/test-broker-adapters.html`, broker detection and parsing

## Sample data

`tests/sample-data/` holds `Hood.csv` (Robinhood), `Tasty.csv` (tastytrade) and `sample-data-messy.csv` (generic format with edge cases). Personal exports placed there are ignored by git.
