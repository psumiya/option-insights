---
title: Uploading your trades
parent: Getting started
nav_order: 2
---

# Uploading your trades
{: .no_toc }

1. TOC
{:toc}

## Export a CSV from your broker

**Robinhood (web)**

1. Account → Reporting and statements → Reports
2. Generate new report → Account activity
3. Pick a date range, choose CSV, Download

**tastytrade (desktop or web)**

1. Activity → Transactions
2. Set the date range
3. Click the CSV / download icon

Choose a date range that starts before the oldest position you want analyzed. A position opened before the export window shows only its closing side, so its P/L is understated; the app flags these rather than guessing. See [How P/L is calculated]({{ '/guides/pl-definitions/' | relative_url }}#what-an-export-cannot-reconcile).

Any other broker works through the [generic format]({{ '/reference/brokers/' | relative_url }}#generic-format), a CSV with at least `Symbol` and `Entry` columns.

## Upload it

Click **Upload CSV** and either drag the file onto the dialog or click **Browse Files**.

![The upload dialog, with export steps for each broker]({{ '/assets/images/screenshots/upload-dialog.png' | relative_url }})

The app detects the broker from the header row, rebuilds positions from the individual legs, and confirms how many trades it loaded.

![The report right after a tastytrade export is loaded]({{ '/assets/images/screenshots/upload-success.png' | relative_url }})

## What happens to the file

The file is read in the page with the browser's `FileReader`. Nothing is uploaded anywhere. The reconstructed trades are saved to `localStorage` so a reload opens the same report. Uploading a new file replaces the old trades; **Clear** removes them.

Symbol and strategy filters live only in the URL, so a new upload never opens already filtered. The date range and position status you last picked are remembered.

## If something looks wrong

- **The format wasn't recognized.** Check the header row against [Broker formats]({{ '/reference/brokers/' | relative_url }}).
- **Some trades are missing.** Rows without a symbol or date are skipped, and the browser console (F12) lists each skipped row.
- **Totals don't match the statement.** Use the **Gross** toggle in the P/L by Symbol & Strategy table, and read [How P/L is calculated]({{ '/guides/pl-definitions/' | relative_url }}).

More in the [FAQ]({{ '/reference/faq/' | relative_url }}).
