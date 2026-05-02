// ===== SYNTHETICBULL DUMMY DATA GENERATORS =====
// All data matches the exact API response schemas from the backend

// ---------- HELPERS ----------
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

const nanoTimestamp = (date = new Date()) => date.getTime() * 1_000_000;
const randomBetween = (min, max) => min + Math.random() * (max - min);
const randomInt = (min, max) => Math.floor(randomBetween(min, max));

// ---------- ASSETS (INDIAN STOCKS) ----------
const ASSETS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', initial_price: 3000.00, mu: 0.00005, sigma: 0.012 },
  { symbol: 'TCS', name: 'Tata Consultancy Svc', initial_price: 4000.00, mu: 0.00006, sigma: 0.011 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', initial_price: 1480.00, mu: 0.00004, sigma: 0.010 },
  { symbol: 'INFY', name: 'Infosys Ltd', initial_price: 1500.00, mu: 0.00005, sigma: 0.014 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', initial_price: 950.00, mu: 0.00006, sigma: 0.012 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', initial_price: 1120.00, mu: 0.00007, sigma: 0.015 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', initial_price: 2500.00, mu: 0.00008, sigma: 0.025 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', initial_price: 1000.00, mu: 0.00006, sigma: 0.018 },
];

// ---------- INTERVAL MAP (extended) ----------
const INTERVAL_MS: Record<string, number> = {
  '1s':  1_000,
  '5s':  5_000,
  '1m':  60_000,
  '5m':  300_000,
  '1h':  3_600_000,
  '1d':  86_400_000,
};

// Live-like prices that drift over time (seeded by history generation below)
const priceState: Record<string, number> = {};
ASSETS.forEach(a => { priceState[a.symbol] = a.initial_price; });

// ---------- GBM CANDLE ENGINE ----------
// Box-Muller Gaussian sample
function gauss(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Simulate one candle by walking `steps` GBM sub-steps within the period.
// Guarantees: high >= max(open,close), low <= min(open,close), open == prev close.
function gbmCandle(
  open: number, mu: number, sigma: number, dtDays: number, steps = 20
): { open: number; high: number; low: number; close: number } {
  const subDt = dtDays / steps;
  const drift = (mu - 0.5 * sigma * sigma) * subDt;
  const vol   = sigma * Math.sqrt(subDt);
  let price = open;
  let high  = open;
  let low   = open;
  for (let i = 0; i < steps; i++) {
    price *= Math.exp(drift + vol * gauss());
    if (price > high) high = price;
    if (price < low)  low  = price;
  }
  return { open, high, low, close: price };
}

// ---------- PRE-GENERATED 1-YEAR CANDLE HISTORY ----------
const candleHistory: Map<string, Map<string, any[]>> = new Map();

function buildHistory(symbol: string, interval: string, count: number): any[] {
  const asset = ASSETS.find(a => a.symbol === symbol)!;
  const intervalMs = INTERVAL_MS[interval];
  const dtDays = intervalMs / 86_400_000;
  const now = Date.now();
  const candles: any[] = [];
  let price = asset.initial_price * (0.70 + Math.random() * 0.20);
  for (let i = count; i >= 0; i--) {
    const c = gbmCandle(price, asset.mu, asset.sigma, dtDays, 20);
    price = c.close;
    const openTime = now - i * intervalMs;
    candles.push({
      open:  parseFloat(c.open.toFixed(2)),
      high:  parseFloat(c.high.toFixed(2)),
      low:   parseFloat(c.low.toFixed(2)),
      close: parseFloat(c.close.toFixed(2)),
      volume: randomInt(5_000, 1_000_000),
      open_time:  nanoTimestamp(new Date(openTime)),
      close_time: nanoTimestamp(new Date(openTime + intervalMs)),
    });
  }
  priceState[symbol] = price;
  return candles;
}

ASSETS.forEach(a => {
  const sym = new Map<string, any[]>();
  sym.set('1d', buildHistory(a.symbol, '1d', 365));
  sym.set('1h', buildHistory(a.symbol, '1h', 720));
  candleHistory.set(a.symbol, sym);
});

function getCurrentPrice(symbol: string) {
  const asset = ASSETS.find(a => a.symbol === symbol);
  if (!asset) return 0;
  // dt = 0.5s expressed in days
  const dt = 0.5 / 86_400;
  const drift = (asset.mu - 0.5 * asset.sigma * asset.sigma) * dt;
  const vol   = asset.sigma * Math.sqrt(dt) * gauss();
  priceState[symbol] *= Math.exp(drift + vol);
  return priceState[symbol];
}

export function getAssets() {
  return ASSETS.map(a => ({
    symbol: a.symbol,
    name: a.name,
    initial_price: a.initial_price,
    current_price: parseFloat(getCurrentPrice(a.symbol).toFixed(2)),
  }));
}

export function getAssetDetail(symbol: string) {
  const a = ASSETS.find(x => x.symbol === symbol);
  if (!a) return null;
  return {
    symbol: a.symbol,
    name: a.name,
    current_price: parseFloat(getCurrentPrice(a.symbol).toFixed(2)),
    initial_price: a.initial_price,
    mu: a.mu,
    sigma: a.sigma,
  };
}

// ---------- ORDER BOOK ----------
export function getOrderBook(symbol: string) {
  const price = priceState[symbol] || 1000.00;
  // Indian market tick size is typically 0.05
  const tickSize = 0.05;
  const bids: any[] = [];
  const asks: any[] = [];

  for (let i = 0; i < 15; i++) {
    const bidPrice = parseFloat((price - (i * tickSize + Math.random() * tickSize)).toFixed(2));
    const askPrice = parseFloat((price + (i * tickSize + Math.random() * tickSize)).toFixed(2));
    bids.push({
      price: bidPrice,
      total_quantity: randomInt(10, 5000),      // whole shares
      order_count: randomInt(1, 20),
    });
    asks.push({
      price: askPrice,
      total_quantity: randomInt(10, 5000),
      order_count: randomInt(1, 20),
    });
  }

  return {
    symbol,
    bids: bids.sort((a, b) => b.price - a.price),
    asks: asks.sort((a, b) => a.price - b.price),
    mid_price: parseFloat(price.toFixed(2)),
  };
}

// ---------- CANDLES (OHLCV) ----------
export function getCandles(symbol: string, interval = '1m', count = 100) {
  // Long intervals served from pre-generated history
  if (interval === '1d' || interval === '1h') {
    const history = candleHistory.get(symbol)?.get(interval) || [];
    return history.slice(-Math.min(count, history.length));
  }

  // Short intervals: generate fresh GBM candles from a back-extrapolated start price
  const asset = ASSETS.find(a => a.symbol === symbol);
  const mu    = asset?.mu    ?? 0.00005;
  const sigma = asset?.sigma ?? 0.012;
  const intervalMs = INTERVAL_MS[interval] || 60_000;
  const dtDays = intervalMs / 86_400_000;
  const now = Date.now();
  const candles: any[] = [];
  // Back-extrapolate so the walk ends near current priceState
  let price = (priceState[symbol] || asset?.initial_price || 1000)
    * Math.exp(-(mu - 0.5 * sigma * sigma) * count * dtDays);

  for (let i = count; i >= 0; i--) {
    const c = gbmCandle(price, mu, sigma, dtDays, 10);
    price = c.close;
    const openTime = now - i * intervalMs;
    candles.push({
      open:  parseFloat(c.open.toFixed(2)),
      high:  parseFloat(c.high.toFixed(2)),
      low:   parseFloat(c.low.toFixed(2)),
      close: parseFloat(c.close.toFixed(2)),
      volume: randomInt(5_000, 1_000_000),
      open_time:  nanoTimestamp(new Date(openTime)),
      close_time: nanoTimestamp(new Date(openTime + intervalMs)),
    });
  }
  return candles;
}

// ---------- ORDERS ----------
const ORDER_STATUSES = ['submitted', 'partial', 'filled', 'cancelled', 'rejected'];
const ORDER_TYPES = ['limit', 'market', 'stop'];
const SIDES = ['buy', 'sell'];

let mockOrders: any[] | null = null;

function generateOrders() {
  if (mockOrders) return mockOrders;
  mockOrders = [];
  for (let i = 0; i < 20; i++) {
    const sym = ASSETS[randomInt(0, ASSETS.length)].symbol;
    const price = priceState[sym] || 1000.00;
    const qty = randomInt(1, 500); // whole shares
    const filledQty = randomInt(0, qty);
    const status = ORDER_STATUSES[randomInt(0, 5)];
    const createdAt = nanoTimestamp(new Date(Date.now() - randomInt(60000, 86400000)));

    mockOrders.push({
      id: uuid(),
      asset_symbol: sym,
      type: ORDER_TYPES[randomInt(0, 3)],
      side: SIDES[randomInt(0, 2)],
      price: parseFloat((price * (0.97 + Math.random() * 0.06)).toFixed(2)),
      quantity: qty,
      filled_quantity: status === 'filled' ? qty : status === 'partial' ? filledQty : 0,
      status,
      created_at: createdAt,
      updated_at: createdAt + nanoTimestamp(new Date(randomInt(1000, 60000))),
    });
  }
  return mockOrders;
}

export function getOrders() {
  return generateOrders();
}

export function getOrderById(orderId: string) {
  return generateOrders().find(o => o.id === orderId) || null;
}

export function submitOrder(order: any) {
  const sym: string = order.asset_symbol;
  const qty: number = parseInt(order.quantity, 10) || 0;
  const execPrice: number = order.price > 0 ? order.price : (priceState[sym] || 1000);
  const cost = execPrice * qty;

  if (order.side === 'buy') {
    portfolioState.cash_balance -= cost;
    if (!holdingsState[sym]) holdingsState[sym] = { quantity: 0, avg_cost_basis: execPrice };
    const h = holdingsState[sym];
    const newAvg = (h.avg_cost_basis * h.quantity + cost) / (h.quantity + qty);
    h.quantity += qty;
    h.avg_cost_basis = newAvg;
  } else if (order.side === 'sell') {
    const h = holdingsState[sym];
    if (h && h.quantity >= qty) {
      portfolioState.realized_pnl += (execPrice - h.avg_cost_basis) * qty;
      portfolioState.cash_balance += cost;
      h.quantity -= qty;
    }
  }

  const newOrder = {
    id: uuid(),
    ...order,
    price: execPrice,
    filled_quantity: qty,
    status: 'filled',
    created_at: nanoTimestamp(),
    updated_at: nanoTimestamp(),
  };
  if (mockOrders) mockOrders.unshift(newOrder);
  return { id: newOrder.id, status: 'filled' };
}

export function cancelOrder(orderId: string) {
  if (mockOrders) {
    const order = mockOrders.find(o => o.id === orderId);
    if (order) order.status = 'cancelled';
  }
  return { id: orderId, status: 'cancelled' };
}

// ---------- TRADES ----------
let mockTrades: any[] | null = null;

function generateTrades() {
  if (mockTrades) return mockTrades;
  mockTrades = [];
  for (let i = 0; i < 50; i++) {
    const sym = ASSETS[randomInt(0, ASSETS.length)].symbol;
    const price = priceState[sym] || 1000.00;
    mockTrades.push({
      id: uuid(),
      asset_symbol: sym,
      price: parseFloat((price * (0.99 + Math.random() * 0.02)).toFixed(2)),
      quantity: randomInt(1, 1000), // whole shares
      aggressor_side: SIDES[randomInt(0, 2)],
      buy_order_id: uuid(),
      sell_order_id: uuid(),
      executed_at: nanoTimestamp(new Date(Date.now() - randomInt(1000, 3600000))),
    });
  }
  mockTrades.sort((a, b) => b.executed_at - a.executed_at);
  return mockTrades;
}

export function getTrades() {
  return generateTrades();
}

export function getPublicTrades() {
  return generateTrades().map(({ buy_order_id, sell_order_id, ...rest }) => rest);
}

// ---------- PORTFOLIO (mutable state) ----------
const portfolioState = {
  cash_balance: 574320.56,
  realized_pnl: 12450.80,
};

interface Holding { quantity: number; avg_cost_basis: number; }
const holdingsState: Record<string, Holding> = {
  RELIANCE: { quantity: 100, avg_cost_basis: 2420.00 },
  TCS:      { quantity: 50,  avg_cost_basis: 3580.00 },
  HDFCBANK: { quantity: 200, avg_cost_basis: 1450.00 },
};

export function getPortfolio() {
  const unrealized = Object.entries(holdingsState).reduce((sum, [sym, h]) => {
    return sum + (priceState[sym] - h.avg_cost_basis) * h.quantity;
  }, 0);
  return {
    user_id: 'user-dandip',
    cash_balance: parseFloat(portfolioState.cash_balance.toFixed(2)),
    realized_pnl: parseFloat(portfolioState.realized_pnl.toFixed(2)),
    unrealized_pnl: parseFloat(unrealized.toFixed(2)),
  };
}

export function getHoldings() {
  return Object.entries(holdingsState)
    .filter(([, h]) => h.quantity > 0)
    .map(([sym, h]) => ({
      asset_symbol: sym,
      quantity: h.quantity,
      avg_cost_basis: parseFloat(h.avg_cost_basis.toFixed(2)),
      market_value: parseFloat((priceState[sym] * h.quantity).toFixed(2)),
    }));
}

export function getPnL() {
  const unrealized = Object.entries(holdingsState).reduce((sum, [sym, h]) => {
    return sum + (priceState[sym] - h.avg_cost_basis) * h.quantity;
  }, 0);
  const total = portfolioState.realized_pnl + unrealized;
  return {
    realized_pnl: parseFloat(portfolioState.realized_pnl.toFixed(2)),
    unrealized_pnl: parseFloat(unrealized.toFixed(2)),
    total_pnl: parseFloat(total.toFixed(2)),
  };
}

// ---------- BOTS ----------
export function getBots() {
  return [
    {
      id: 'bot-' + uuid().slice(0, 8),
      name: 'Nifty Scalper',
      bot_type: 'market_maker',
      is_active: true,
      config: JSON.stringify({ spread_pct: 0.002, order_size: 100, max_inventory: 5000, num_levels: 5 }),
    },
    {
      id: 'bot-' + uuid().slice(0, 8),
      name: 'Trend Follower',
      bot_type: 'alpha',
      is_active: false,
      config: JSON.stringify({ fast_ma: 10, slow_ma: 30, rsi_period: 14, rsi_overbought: 70, rsi_oversold: 30 }),
    },
  ];
}

// ---------- ADMIN / ENGINE STATS ----------
export function getEngineStats() {
  return {
    total_orders_submitted: 45847,
    total_trades_executed: 28923,
    orders_per_symbol: { RELIANCE: 12000, TCS: 11000, HDFCBANK: 8800, INFY: 6100, ICICIBANK: 4900, BHARTIARTL: 3047 },
    trades_per_symbol: { RELIANCE: 8500, TCS: 7800, HDFCBANK: 5600, INFY: 4200, ICICIBANK: 2100, BHARTIARTL: 723 },
    avg_order_latency_ms: 0.038,
    avg_match_latency_ms: 0.015,
    uptime_seconds: 17245,
  };
}

// ---------- SIMULATED TRADE STREAM ----------
export function generateLiveTrade(symbol: string) {
  const price = getCurrentPrice(symbol);
  return {
    type: 'TRADE_PRINT',
    price: parseFloat(price.toFixed(2)),
    qty: randomInt(1, 1000), // whole shares
    side: Math.random() > 0.5 ? 'buy' : 'sell',
    symbol,
  };
}
