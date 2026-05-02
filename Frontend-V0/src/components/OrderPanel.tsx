'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Info, TrendingUp, TrendingDown, Zap, X } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import './OrderPanel.css';

export default function OrderPanel({ symbol, currentPrice, onSubmitOrder, cashBalance, onClose }: any) {
  const { selectedSymbol, isOrderActive, setIsOrderActive } = useMarket();
  const activeSymbol = symbol || selectedSymbol;

  const [side, setSide] = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [price, setPrice] = useState(currentPrice?.toFixed(2) || '');
  const [quantity, setQuantity] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const quantityRef = useRef<HTMLInputElement>(null);

  const isBuy = side === 'buy';
  const parsedQty = parseInt(quantity, 10) || 0;
  const accentColor = isBuy ? 'var(--color-buy)' : 'var(--color-sell)';

  // Reset fields when symbol changes
  React.useEffect(() => {
    setPrice(currentPrice?.toFixed(2) || '');
    setQuantity('');
    setStopPrice('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSymbol]);

  // Keep displayed price in sync with live ticks (don't reset quantity)
  React.useEffect(() => {
    setPrice(currentPrice?.toFixed(2) || '');
  }, [currentPrice]);

  const total = price && quantity ? (parseFloat(price) * parseFloat(quantity)).toFixed(2) : '0.00';
  const estimatedTotal = orderType === 'market'
    ? (currentPrice || 0) * parsedQty
    : parseFloat(price || '0') * parsedQty;
  const isValidOrder = parsedQty > 0 && (orderType === 'market' || parseFloat(price) > 0);

  const handleSideChange = (s: string) => {
    setSide(s);
    setIsOrderActive(true);
  };

  const handleTypeChange = (t: string) => {
    setOrderType(t);
    if (t === 'market') setPrice(currentPrice?.toFixed(2) || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity) return;
    if (orderType === 'stop' && (!price || !stopPrice)) return;
    if (orderType === 'limit' && !price) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setFeedback(null);
    try {
      const order = {
        asset_symbol: activeSymbol,
        type: orderType,
        side,
        price: orderType === 'market' ? 0 : parseFloat(price),
        quantity: parseInt(quantity, 10),
        stop_price: 0,
      };
      await onSubmitOrder(order);
      setFeedback({
        type: 'success',
        message: `${side === 'buy' ? 'Buy' : 'Sell'} order placed for ${quantity} share${parseInt(quantity) > 1 ? 's' : ''} of ${activeSymbol}!`,
      });
      setQuantity('');
      setIsOrderActive(false); // Revert layout on success
    } catch {
      setFeedback({ type: 'error', message: 'Order failed. Please try again.' });
    }
    setSubmitting(false);
    setTimeout(() => setFeedback(null), 4000);
  };



  return (
    <div className={`order-panel card op-${side}`} id="order-panel">
      {/* ── Header ── */}
      <div className="op-header">
        <div className="op-header-left">
          <span className="op-title">Place Order</span>
          <span className="op-symbol-badge">{activeSymbol}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentPrice > 0 && (
            <div className="op-live-price mono">
              ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="op-live-dot" />
            </div>
          )}
          {(isOrderActive || onClose) && (
            <button 
              className="op-close-btn"
              onClick={() => {
                if (onClose) onClose();
                else setIsOrderActive(false);
              }}
              aria-label="Close Order Panel"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Buy / Sell Toggle ── */}
      <div className="op-side-toggle">
        <button
          className={`op-side-btn op-buy-btn ${isBuy ? 'active' : ''}`}
          onClick={() => handleSideChange('buy')}
          id="btn-side-buy"
          type="button"
        >
          <TrendingUp size={14} />
          Buy
        </button>
        <button
          className={`op-side-btn op-sell-btn ${!isBuy ? 'active' : ''}`}
          onClick={() => handleSideChange('sell')}
          id="btn-side-sell"
          type="button"
        >
          <TrendingDown size={14} />
          Sell
        </button>
      </div>

      {/* Order Type */}
      <div className="order-type-tabs">
        {['market', 'stop'].map(t => (
          <button
            key={t}
            className={`op-type-tab ${orderType === t ? 'active' : ''}`}
            onClick={() => handleTypeChange(t)}
            id={`order-type-${t}`}
            type="button"
          >
            {t === 'stop' ? 'Limit' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="order-form">
        {/* Price (not for market orders) */}


        {/* Stop Price */}
        {orderType === 'stop' && (
          <>
            <div className="form-group">
              <label>Limit Price (INR)</label>
              <div className="input-with-icon">
                <span className="input-icon">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="mono"
                  id="input-price"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Stop Loss (INR)</label>
              <div className="input-with-icon">
                <span className="input-icon">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={stopPrice}
                  onChange={e => setStopPrice(e.target.value)}
                  placeholder="0.00"
                  className="mono"
                  id="input-stop-price"
                />
              </div>
            </div>
          </>
        )}

        {/* Quantity */}
        <div className="form-group">
          <label>Shares</label>
          <input
            ref={quantityRef}
            type="number"
            step="1"
            min="1"
            value={quantity}
            onChange={e => { setQuantity(e.target.value); setErrors(prev => ({ ...prev, quantity: undefined })); }}
            placeholder="Enter shares"
            className="mono op-input"
            id="input-quantity"
          />
          {errors.quantity && <span className="op-error-msg">{errors.quantity}</span>}
        </div>



        {/* Total */}
        <div className="order-total">
          <span className="total-label">Estimated Total</span>
          <span className="total-value mono">₹{parseFloat(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          className={`op-submit-btn ${isBuy ? 'op-submit-buy' : 'op-submit-sell'}`}
          disabled={submitting || !isValidOrder}
          id="btn-submit-order"
        >
          {submitting ? (
            <span className="op-submitting">
              <span className="op-spinner" />
              Placing Order…
            </span>
          ) : (
            <>
              {isBuy ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {isBuy ? 'Buy' : 'Sell'} {parsedQty > 0 ? parsedQty : ''} {activeSymbol}
            </>
          )}
        </button>

        {/* ── Feedback ── */}
        {feedback && (
          <div className={`op-feedback op-feedback-${feedback.type}`}>
            {feedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {feedback.message}
          </div>
        )}
      </form>

      {/* ── Confirmation Overlay ── */}
      {showConfirm && (
        <div className="op-confirm-overlay">
          <div className="op-confirm-box">
            <div className="op-confirm-title">Confirm Order</div>
            <div className="op-confirm-details">
              <div className="op-confirm-row">
                <span>Action</span>
                <span className={isBuy ? 'text-buy' : 'text-sell'} style={{ fontWeight: 700 }}>
                  {isBuy ? 'BUY' : 'SELL'} · {orderType.toUpperCase()}
                </span>
              </div>
              <div className="op-confirm-row">
                <span>Symbol</span>
                <span className="mono">{activeSymbol}</span>
              </div>
              <div className="op-confirm-row">
                <span>Shares</span>
                <span className="mono">{parsedQty.toLocaleString('en-IN')}</span>
              </div>
              {orderType !== 'market' && (
                <div className="op-confirm-row">
                  <span>Price</span>
                  <span className="mono">₹{parseFloat(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="op-confirm-row op-confirm-total">
                <span>Est. Total</span>
                <span className="mono" style={{ color: accentColor }}>
                  ₹{estimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="op-confirm-actions">
              <button
                type="button"
                className="op-confirm-cancel"
                onClick={() => { setShowConfirm(false); setIsOrderActive(false); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`op-confirm-submit ${isBuy ? 'op-submit-buy' : 'op-submit-sell'}`}
                onClick={handleConfirm}
              >
                Confirm {isBuy ? 'Buy' : 'Sell'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
