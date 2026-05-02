'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import * as ws from '../../services/websocket';

interface MarketDepthProps {
  symbol: string;
  backendSymbol: string;
}

interface DepthLevel {
  price: number;
  quantity: number;
  orders: number;
}

// Generate realistic dummy depth from a mid price
function generateDummyDepth(midPrice: number): { bids: DepthLevel[]; asks: DepthLevel[] } {
  const spread = midPrice * 0.002;
  const bids: DepthLevel[] = [];
  const asks: DepthLevel[] = [];
  for (let i = 0; i < 5; i++) {
    bids.push({
      price: parseFloat((midPrice - spread * (i + 1)).toFixed(2)),
      quantity: Math.floor(50 + Math.random() * 400),
      orders: Math.floor(1 + Math.random() * 15),
    });
    asks.push({
      price: parseFloat((midPrice + spread * (i + 1)).toFixed(2)),
      quantity: Math.floor(50 + Math.random() * 400),
      orders: Math.floor(1 + Math.random() * 15),
    });
  }
  return { bids, asks };
}

export default function MarketDepth({ symbol, backendSymbol }: MarketDepthProps) {
  const [depth, setDepth] = useState<{ bids: DepthLevel[]; asks: DepthLevel[] } | null>(null);

  const loadDepth = useCallback(async () => {
    try {
      const data = await api.getOrderBook(backendSymbol);
      if (data?.bids?.length && data?.asks?.length) {
        const bids = data.bids.slice(0, 5).map((b: any) => ({
          price: parseFloat(b.price.toFixed(2)),
          quantity: parseFloat(b.total_quantity.toFixed(0)),
          orders: b.order_count || Math.floor(1 + Math.random() * 10),
        }));
        const asks = data.asks.slice(0, 5).map((a: any) => ({
          price: parseFloat(a.price.toFixed(2)),
          quantity: parseFloat(a.total_quantity.toFixed(0)),
          orders: a.order_count || Math.floor(1 + Math.random() * 10),
        }));
        setDepth({ bids, asks });
      } else {
        // fallback dummy
        setDepth(generateDummyDepth(2850));
      }
    } catch {
      setDepth(generateDummyDepth(2850));
    }
  }, [backendSymbol]);

  useEffect(() => {
    loadDepth();
    const iv = window.setInterval(loadDepth, 5000);
    return () => window.clearInterval(iv);
  }, [loadDepth]);

  if (!depth) {
    return (
      <div className="depth-panel">
        <div className="depth-panel-title">Market Depth</div>
        <div className="positions-empty">Loading depth data...</div>
      </div>
    );
  }

  const maxQty = Math.max(
    ...depth.bids.map(b => b.quantity),
    ...depth.asks.map(a => a.quantity),
    1
  );

  const totalBidQty = depth.bids.reduce((s, b) => s + b.quantity, 0);
  const totalAskQty = depth.asks.reduce((s, a) => s + a.quantity, 0);

  return (
    <div className="depth-panel">
      <div className="depth-panel-title">
        Market Depth
        <span className="live-dot" />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>{symbol} · NSE</span>
      </div>

      <table className="depth-table">
        <thead>
          <tr>
            <th className="left">Orders</th>
            <th>Bid Qty</th>
            <th className="center">Price</th>
            <th>Ask Qty</th>
            <th>Orders</th>
          </tr>
        </thead>
        <tbody>
          {depth.bids.map((bid, i) => {
            const ask = depth.asks[i];
            return (
              <tr key={i} className="depth-row">
                {/* Bid bar */}
                <div className="depth-bar bid-bar" style={{ width: `${(bid.quantity / maxQty) * 50}%` }} />
                {/* Ask bar */}
                <div className="depth-bar ask-bar" style={{ width: `${(ask.quantity / maxQty) * 50}%` }} />

                <td className="left depth-orders">{bid.orders}</td>
                <td className="depth-qty">{bid.quantity.toLocaleString('en-IN')}</td>
                <td className="center">
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                    <span className="depth-price bid">₹{bid.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    <span className="depth-price ask">₹{ask.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </td>
                <td className="depth-qty">{ask.quantity.toLocaleString('en-IN')}</td>
                <td className="depth-orders">{ask.orders}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="depth-total-row">
        <div>
          <span className="label">Total Bid: </span>
          <span className="bid">{totalBidQty.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="label">Total Ask: </span>
          <span className="ask">{totalAskQty.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}
