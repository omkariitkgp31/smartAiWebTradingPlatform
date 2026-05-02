'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, CheckCircle2, AlertCircle } from 'lucide-react';
import * as api from '../../services/api';

interface TerminalOrderPanelProps {
  symbol: string;
  currentPrice: number;
}

export default function TerminalOrderPanel({ symbol, currentPrice }: TerminalOrderPanelProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [price, setPrice] = useState(currentPrice > 0 ? currentPrice.toFixed(2) : '');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isBuy = side === 'buy';
  const parsedQty = parseInt(quantity, 10) || 0;
  const parsedPrice = parseFloat(price) || 0;
  const estimatedTotal = orderType === 'market'
    ? currentPrice * parsedQty
    : parsedPrice * parsedQty;
  const isValid = parsedQty > 0 && (orderType === 'market' || parsedPrice > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const order = {
        asset_symbol: symbol,
        type: orderType,
        side,
        price: orderType === 'market' ? 0 : parsedPrice,
        quantity: parsedQty,
      };
      await api.submitOrder(order);
      setFeedback({ type: 'success', message: `${side.toUpperCase()} order placed for ${parsedQty} shares!` });
      setQuantity('');
    } catch {
      setFeedback({ type: 'error', message: 'Order failed. Try again.' });
    }
    setSubmitting(false);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="t-order-panel">
      <div className="t-order-header">
        <span className="t-order-title">Place Order · {symbol}</span>
      </div>

      {/* Buy/Sell Toggle */}
      <div className="t-side-toggle">
        <button className={`t-side-btn buy ${isBuy ? 'active' : ''}`} onClick={() => setSide('buy')}>
          <TrendingUp size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Buy
        </button>
        <button className={`t-side-btn sell ${!isBuy ? 'active' : ''}`} onClick={() => setSide('sell')}>
          <TrendingDown size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Sell
        </button>
      </div>

      {/* Type Tabs */}
      <div className="t-type-tabs">
        {(['market', 'limit'] as const).map(t => (
          <button
            key={t}
            className={`t-type-tab ${orderType === t ? 'active' : ''}`}
            onClick={() => { setOrderType(t); if (t === 'market') setPrice(currentPrice.toFixed(2)); }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Price (only for limit orders) */}
        {orderType === 'limit' && (
          <div className="t-form-group">
            <label>Price (INR)</label>
            <div className="t-input-wrap">
              <span className="currency-icon">₹</span>
              <input
                type="number"
                step="0.01"
                className="t-input with-icon"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="t-form-group">
          <label>Shares</label>
          <input
            type="number"
            step="1"
            min="1"
            className="t-input"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="Enter quantity"
          />
        </div>

        {/* Total */}
        <div className="t-total-row">
          <span className="t-total-label">Estimated Total</span>
          <span className="t-total-value">
            ₹{estimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className={`t-submit-btn ${isBuy ? 'buy-btn' : 'sell-btn'}`}
          disabled={submitting || !isValid}
        >
          {submitting ? 'Placing...' : (
            <>
              {isBuy ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {isBuy ? 'Buy' : 'Sell'} {parsedQty > 0 ? parsedQty : ''} {symbol}
            </>
          )}
        </button>

        {/* Feedback */}
        {feedback && (
          <div className={`t-order-feedback ${feedback.type}`}>
            {feedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {feedback.message}
          </div>
        )}
      </form>
    </div>
  );
}
