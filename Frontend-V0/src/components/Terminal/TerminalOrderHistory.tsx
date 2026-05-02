'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import * as api from '../../services/api';

interface TerminalOrderHistoryProps {
  symbol?: string;
}

export default function TerminalOrderHistory({ symbol }: TerminalOrderHistoryProps) {
  const [orders, setOrders] = useState<any[]>([]);

  const loadOrders = useCallback(async () => {
    try {
      const data = await api.getOrders(1, 20);
      const list = data?.data || [];
      // Optionally filter by symbol
      const filtered = symbol ? list.filter((o: any) => o.asset_symbol === symbol || !symbol) : list;
      setOrders(filtered.slice(0, 15));
    } catch {
      setOrders([]);
    }
  }, [symbol]);

  useEffect(() => {
    loadOrders();
    const iv = window.setInterval(loadOrders, 5000);
    return () => window.clearInterval(iv);
  }, [loadOrders]);

  const handleCancel = async (orderId: string) => {
    try {
      await api.cancelOrder(orderId);
      loadOrders();
    } catch { /* silent */ }
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  const getStatusClass = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('fill') || s.includes('complete')) return 'filled';
    if (s.includes('open') || s.includes('pending') || s.includes('new')) return 'open';
    if (s.includes('cancel')) return 'cancelled';
    return 'filled';
  };

  return (
    <div className="history-panel">
      <div className="history-panel-title">Order History</div>

      {orders.length === 0 ? (
        <div className="history-empty">
          <ClipboardList size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
          <p>No recent orders</p>
        </div>
      ) : (
        orders.map((order, i) => {
          const isBuy = (order.side || '').toLowerCase() === 'buy';
          const statusClass = getStatusClass(order.status || 'filled');
          return (
            <div key={order.id || i} className="history-item">
              <div className="history-left">
                <span className={`history-side ${isBuy ? 'buy' : 'sell'}`}>
                  {isBuy ? 'BUY' : 'SELL'} · {(order.type || 'market').toUpperCase()}
                </span>
                <span className="history-meta">
                  {order.asset_symbol || symbol} · {order.quantity || 0} shares · {formatTime(order.created_at || order.timestamp || '')}
                </span>
              </div>
              <div className="history-right">
                <span className="history-price">
                  ₹{(order.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={`history-status ${statusClass}`}>{(order.status || 'filled').toUpperCase()}</span>
                  {statusClass === 'open' && (
                    <button className="history-cancel-btn" onClick={() => handleCancel(order.id)}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
