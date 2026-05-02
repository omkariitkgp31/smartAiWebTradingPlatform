'use client';

import React from 'react';
import './OrderBook.css';

export default function OrderBook({ orderBook }) {
  if (!orderBook) return null;

  const { bids, asks, mid_price } = orderBook;
  const displayBids = bids.slice(0, 12);
  const displayAsks = asks.slice(0, 12);

  // Calculate max quantity for bar width
  const maxQty = Math.max(
    ...displayBids.map(b => b.total_quantity || 0),
    ...displayAsks.map(a => a.total_quantity || 0)
  );

  // Calculate cumulative volumes
  let bidCumulative = 0;
  const bidsWithCum = displayBids.map(b => {
    bidCumulative += b.total_quantity;
    return { ...b, cumulative: bidCumulative };
  });

  let askCumulative = 0;
  const asksWithCum = displayAsks.map(a => {
    askCumulative += a.total_quantity;
    return { ...a, cumulative: askCumulative };
  });

  return (
    <div className="orderbook card" id="order-book">
      <div className="card-header">
        <h3>Order Book</h3>
        <span className="badge badge-accent">{orderBook.symbol}</span>
      </div>

      <div className="orderbook-labels">
        <span>Price</span>
        <span>Size</span>
        <span>Total</span>
      </div>

      <div className="orderbook-body">
        {/* Asks (reversed so lowest ask is at bottom) */}
        <div className="orderbook-asks">
          {[...asksWithCum].reverse().map((ask, i) => (
            <div className="orderbook-row ask-row" key={`ask-${i}`}>
              <div
                className="orderbook-bar ask-bar"
                style={{ width: `${(ask.total_quantity / maxQty) * 100}%` }}
              />
              <span className="orderbook-price mono text-sell">{ask.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="orderbook-size mono">{ask.total_quantity.toFixed(2)}</span>
              <span className="orderbook-cum mono">{ask.cumulative.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Spread / Mid Price */}
        <div className="orderbook-spread">
          <span className="spread-price mono">₹{mid_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          <span className="spread-price mono">₹{mid_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          <span className="spread-label">Mid Price</span>
          {displayAsks[0] && displayBids[0] && (
            <span className="spread-value mono">
              Spread: ₹{(displayAsks[0].price - displayBids[0].price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {/* Bids */}
        <div className="orderbook-bids">
          {bidsWithCum.map((bid, i) => (
            <div className="orderbook-row bid-row" key={`bid-${i}`}>
              <div
                className="orderbook-bar bid-bar"
                style={{ width: `${(bid.total_quantity / maxQty) * 100}%` }}
              />
              <span className="orderbook-price mono text-buy">{bid.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="orderbook-size mono">{bid.total_quantity.toFixed(2)}</span>
              <span className="orderbook-cum mono">{bid.cumulative.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
