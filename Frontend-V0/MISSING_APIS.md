# Missing Backend APIs

This document lists backend API endpoints that the frontend needs but are not currently available, along with the workarounds used.

---

## 1. Asset Statistics Endpoint

**Needed:** `GET /api/v1/assets/{symbol}/stats`

**Response shape:**
```json
{
  "symbol": "BTC",
  "volume_24h": 1234567.89,
  "high_24h": 51200.00,
  "low_24h": 48800.00,
  "change_24h_pct": 2.45,
  "open_24h": 49500.00
}
```

**Why:** The Navbar displays 24h volume, 24h high, and 24h low for the selected asset. These are important metrics for any trading terminal.

**Current workaround:** The frontend computes approximate values from candle data:
- `high_24h` = `Math.max(...candles.map(c => c.high))`
- `low_24h` = `Math.min(...candles.map(c => c.low))`
- `volume_24h` = `candles.reduce((sum, c) => sum + c.volume, 0)`

**Limitations of workaround:**
- Only as accurate as the candle data available (depends on interval and how many candles are returned)
- Candle endpoint may not return a full 24h of data
- Stats are only available when on the Dashboard page (not on other pages)

---

## 2. WebSocket Authentication

**Needed:** Optional authentication for WebSocket connections to receive user-specific events.

**Why:** Currently FILL_CONFIRM events are broadcast to all connected clients. With auth, the server could send fills only to the user who placed the order.

**Current workaround:** The frontend receives all FILL_CONFIRM events and refreshes portfolio data regardless. This works but is inefficient.

---

## 3. Order History Pagination

**Needed:** `GET /api/v1/orders?page=1&limit=50&status=filled`

**Why:** As users accumulate orders, the response payload grows. Pagination would improve performance.

**Current workaround:** Frontend fetches all orders and filters client-side.

---

## Priority

1. **Asset Statistics** - High priority. Directly affects visible UI data accuracy.
2. **WebSocket Auth** - Medium priority. Functional without it, but less efficient.
3. **Order Pagination** - Low priority. Only relevant at scale.
