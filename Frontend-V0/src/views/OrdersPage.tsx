'use client';

import React, { useState, useEffect } from 'react';
import { BarChart2, RefreshCw, Info, Clock, X } from 'lucide-react';
import * as api from '../services/api';
import { useMarket } from '../context/MarketContext';
import OrderPanel from '../components/OrderPanel';
import './OrdersPage.css';

const STATUS_TABS = ['all', 'submitted', 'partial', 'executed', 'cancelled'];

const statusBadgeClass = (status) => {
  switch (status) {
    case 'submitted': return 'badge-info';
    case 'partial': return 'badge-warning';
    case 'executed':
    case 'filled':
    case 'complete': return 'badge-buy';
    case 'cancelled': 
    case 'rejected': return 'badge-sell';
    default: return '';
  }
};

export default function OrdersPage() {
  const { selectedSymbol, assets } = useMarket();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  const loadOrders = () => api.getOrders().then(res => {
    console.log('Normalized Orders Data:', res.data);
    const normalized = (res.data || []).map(o => ({
      ...o,
      status: ['filled', 'complete'].includes(o.status?.toLowerCase()) ? 'executed' : o.status
    }));
    setOrders(normalized);
  }).catch(() => { });

  const handleOrderSubmit = async (order: any) => {
    await api.submitOrder(order);
    loadOrders(); // refresh after placing an order
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = activeTab === 'all'
    ? orders
    : orders.filter(o => o.status === activeTab);

  const formatDate = (nanos) => {
    const date = new Date(Math.floor(nanos / 1_000_000));
    return date.toLocaleString('en-IN', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  };

  const handleCancel = async (orderId) => {
    await api.cancelOrder(orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
  };

  const currentAssetPrice = assets?.find(s => s.symbol === selectedSymbol)?.current_price || 2450.85;

  return (
    <div className="orders-page animate-fade-in" id="orders-page">
      <div className="page-header">
        <h1>Orders</h1>
        <p>View and manage your trading orders</p>
      </div>

      <div className="orders-page-layout">
        <div className="orders-page-main">
          {/* Filter Tabs */}
          <div className="orders-tabs">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                className={`orders-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                id={`orders-tab-${tab}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className="tab-count">
                  {tab === 'all' ? orders.length : orders.filter(o => o.status === tab).length}
                </span>
              </button>
            ))}
          </div>

          {/* Orders Table */}
          <div className="card orders-table-container">
            <table className="data-table" id="orders-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Asset</th>
                  <th>Type</th>
                  <th>Side</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Executed</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id} className="animate-fade-in">
                    <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                      {formatDate(order.created_at)}
                    </td>
                    <td>
                      <span className="order-symbol">{order.asset_symbol}</span>
                    </td>
                    <td>
                      <span className="badge badge-accent">{order.type}</span>
                    </td>
                    <td>
                      <span className={`badge ${order.side === 'buy' ? 'badge-buy' : 'badge-sell'}`}>
                        {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="mono">₹{order.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="mono">{order.quantity.toFixed(4)}</td>
                    <td className="mono">{order.filled_quantity.toFixed(4)}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-tabs">
                        <button className="action-tab-btn" title="Chart">
                          <BarChart2 size={14} />
                        </button>
                        <button className="action-tab-btn active" title="Modify/Repeat">
                          <RefreshCw size={14} />
                        </button>
                        <button className="action-tab-btn" title="Info">
                          <Info size={14} />
                        </button>
                        <button className="action-tab-btn" title="History">
                          <Clock size={14} />
                        </button>
                        {(order.status === 'submitted' || order.status === 'partial') && (
                          <button
                            className="action-tab-btn btn-cancel-icon"
                            onClick={() => handleCancel(order.id)}
                            id={`cancel-order-${order.id.slice(0, 8)}`}
                            title="Cancel Order"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="empty-state">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side Panel */}
        <div className="orders-page-sidebar">
          <OrderPanel 
            symbol={selectedSymbol} 
            currentPrice={currentAssetPrice} 
            onSubmitOrder={handleOrderSubmit}
            cashBalance={100000}
          />
        </div>
      </div>
    </div>
  );
}

