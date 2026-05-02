# Synthetic-Bull: Next-Gen Trading Terminal (Frontend-V0)

Synthetic-Bull is a high-performance, real-time trading frontend built with **Next.js 15** and **React 19**. It provides a premium, low-latency experience for trading assets matched by a C++ core engine.

## Core Features & Pages

### 1. Dashboard (The Trading Terminal)
The central hub for active trading. It features:
- **L2 Order Book**: Live snapshot of market depth (bids/asks) with direct visual representation of liquidity.
- **Interactive Candlestick Chart**: Multi-interval (1m, 5m, 1h) price action visualization with real-time "tick-by-tick" updates via WebSockets.
- **Order Panel**: Advanced order submission supporting **LIMIT**, **MARKET**, **STOP-LOSS**, and **ICEBERG** types.
- **Live Trade History**: A scrolling feed of all public executions on the exchange.
- **Context-Aware Analytics**: Real-time calculation of 24h High/Low and Volume.

### 2. Portfolio Management
A deep-dive into user capital and holdings, designed with an "Indian Equities" simulated skin:
- **Performance Analytics**: Interactive SVG-based P&L charts with time-range filtering (1M to 5Y).
- **Holdings Table**: Real-time tracking of asset quantity, average cost, current market value, and unrealized P&L.
- **Sector Allocation**: A dynamic donut chart showing diversification across sectors (IT, Banking, FMCG, etc.).
- **Net Worth Widget**: High-impact cards for Total Value, Cash Balance (Buying Power), and Realized/Unrealized gains.

### 3. Orders & Watchlist
- **Orders Page**: Management interface for monitoring open, filled, and cancelled orders.
- **Watchlist**: A dedicated view for tracking multiple symbols and their 24h price percentage changes.

---

## Technical Architecture

### Data Integration Strategy
The frontend uses a **Hybrid Real-Time Model** to ensure both speed and eventual consistency:
- **WebSocket (Push)**: Connects to the C++ Matching Engine for public feeds (Trade Prints) and the Go API Gateway for private updates (Order Fills).
- **REST API (Pull)**: For initial page hydration, historical candles, and authoritative portfolio snapshots.
- **Optimistic Updates**: Trade prints are instantly injected into the active candlestick and trade history before the backend flushes the formal candle.

### State Management
- **MarketContext**: A custom React context that provides global access to the `selectedSymbol`, `marketStats`, and `assetDefinitions`.
- **Hooks**: Intensive use of `useCallback` and `useEffect` for managing high-frequency data streams without causing unnecessary re-renders.

### UI / UX Design
- **Aesthetics**: Premium Dark Mode with glassmorphic elements and high-contrast P&L indicators (Green/Red).
- **Responsive Grid**: Modular dashboard layout that adapts to different screen sizes.
- **Interactions**: Interactive SVG charts with hover states, crosshairs, and smooth transitions.

---

## Project Structure
- `/src/views`: Main page components (Dashboard, Portfolio, etc.).
- `/src/components`: Reusable UI elements (Charts, OrderBooks, Modals).
- `/src/services`: Communication layer (API clients, WebSocket handlers).
- `/src/context`: Global application state.

---

> [!NOTE]
> This frontend is optimized for **low-latency environments** and handles the 100,000+ orders/sec capability of the matching engine by aggregating updates efficiently at the client layer.
