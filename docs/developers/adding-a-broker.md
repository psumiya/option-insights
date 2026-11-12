---
title: Adding a broker
parent: Developers
nav_order: 3
---

# Adding a broker

Broker support lives in `js/broker-adapters.js`.

**1. Write an adapter** that converts the broker's rows into the internal trade format (the columns of the [generic format]({{ '/reference/brokers/' | relative_url }}#generic-format)):

```javascript
class NewBrokerAdapter {
  convert(rows) {
    // map each row or group of legs to a trade
    return trades;
  }
}
```

**2. Detect it** in `BrokerAdapter.detectBroker()` from a header unique to that broker:

```javascript
if (headerStr.includes('broker-specific-column')) {
  return 'newbroker';
}
```

**3. Register it** in `BrokerAdapter.getAdapter()`:

```javascript
case 'newbroker':
  return new NewBrokerAdapter();
```

Add a small anonymized sample to `tests/sample-data/` (and an exception for it in that folder's `.gitignore`), plus a `tests/*.test.js` file covering detection and a few reconstructed trades.
