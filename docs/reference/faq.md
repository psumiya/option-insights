---
title: FAQ and troubleshooting
parent: Reference
nav_order: 3
---

# FAQ and troubleshooting
{: .no_toc }

1. TOC
{:toc}

---

## My CSV wasn't recognized

The broker is detected from the header row. Compare yours with [Broker formats]({{ '/reference/brokers/' | relative_url }}). If your broker isn't supported, convert the file to the [generic format]({{ '/reference/brokers/' | relative_url }}#generic-format).

## Some trades are missing

Rows without a symbol or a date are skipped. Open the browser console (F12) to see a warning for each skipped row. Also check the date range and status filters, and any symbol or strategy chips under the tabs.

## My P/L doesn't match my broker statement

Switch the P/L by Symbol & Strategy table to **Gross**, which counts every retired leg before costs the way a statement does. Then check the two cases an export can't reconcile: positions opened before the export window, and positions spanning a year boundary. Both are explained in [How P/L is calculated]({{ '/guides/pl-definitions/' | relative_url }}).

## Max loss and P/L on risk are blank

They need the opening premium, which only tastytrade exports carry, and they don't apply to undefined-risk trades such as naked short options or strangles sold for credit. See [Trades]({{ '/views/trades/' | relative_url }}#max-loss-and-pl-on-risk).

## The time-of-day research is empty

It needs fill times, which tastytrade exports carry and date-only exports such as Robinhood's do not.

## A Research output says the sample is too small

That's deliberate. Statistics like the edge check give no verdict under 10 trades, because any number would mislead. Widen the cut: choose all underlyings, or **All strategies**.

## A trade shows as "Opened before this export"

Only its closing side is in the file. Re-export with a start date before it was opened.

## How do I start over?

Click **Clear** in the header. To also reset your theme and filter preferences, clear site data for the app in your browser settings.

## Can I use it on my phone?

Yes. Export the CSV, open the app in your phone's browser, and upload from Files. The report adapts to the narrow screen.

## Is my data sent anywhere?

No. See [Privacy and data]({{ '/reference/privacy/' | relative_url }}).
