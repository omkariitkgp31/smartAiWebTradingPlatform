'use client';

import React from 'react';

interface TickerItem {
  name: string;
  price: number;
  change: number;
  changePct: number;
}

const DEFAULT_TICKERS: TickerItem[] = [
  { name: 'NIFTY 50', price: 22713.10, change: 33.70, changePct: 0.15 },
  { name: 'SENSEX', price: 73319.55, change: 185.23, changePct: 0.25 },
  { name: 'RELIANCE', price: 2850.00, change: 12.40, changePct: 0.44 },
  { name: 'TCS', price: 3450.00, change: -18.50, changePct: -0.53 },
  { name: 'INFY', price: 1580.00, change: 8.25, changePct: 0.52 },
  { name: 'HDFCBANK', price: 1540.00, change: -5.60, changePct: -0.36 },
  { name: 'BANK NIFTY', price: 48250.30, change: 126.45, changePct: 0.26 },
  { name: 'NIFTY IT', price: 34820.15, change: -42.30, changePct: -0.12 },
];

export default function MarketTicker({ currentStock }: { currentStock?: { symbol: string; price: number; change: number; changePct: number } }) {
  const tickers = currentStock
    ? DEFAULT_TICKERS.map(t => t.name === currentStock.symbol ? { ...t, price: currentStock.price, change: currentStock.change, changePct: currentStock.changePct } : t)
    : DEFAULT_TICKERS;

  return (
    <div className="terminal-ticker">
      {tickers.map((item, i) => (
        <React.Fragment key={item.name}>
          {i > 0 && <div className="ticker-sep" />}
          <div className="ticker-item">
            <span className="ticker-name">{item.name}</span>
            <span className="ticker-price">
              ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`ticker-change ${item.change >= 0 ? 'pos' : 'neg'}`}>
              {item.change >= 0 ? '+' : ''}
              {item.change.toFixed(2)} ({item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%)
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
