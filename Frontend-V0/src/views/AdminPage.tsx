'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Zap, Clock, Activity, Play, Pause } from 'lucide-react';
import * as api from '../services/api';
import StatsCard from '../components/StatsCard';
import './AdminPage.css';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [marketPaused, setMarketPaused] = useState(false);
  const [assets, setAssets] = useState([]);
  const [gbmParams, setGbmParams] = useState({});

  useEffect(() => {
    api.getEngineStats().then(setStats).catch(() => { });
    api.getAssets().then(data => {
      const list = data || [];
      setAssets(list);
      const params = {};
      list.forEach(a => {
        params[a.symbol] = { mu: 0.0001, sigma: 0.02 };
      });
      setGbmParams(params);
    }).catch(() => { });

    const interval = setInterval(() => api.getEngineStats().then(setStats).catch(() => { }), 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePauseResume = async () => {
    if (marketPaused) {
      await api.resumeMarket();
    } else {
      await api.pauseMarket();
    }
    setMarketPaused(!marketPaused);
  };

  const handleUpdateParams = async (symbol) => {
    await api.updateMarketParams(symbol, gbmParams[symbol]);
    alert(`Updated GBM parameters for ${symbol}`);
  };

  const formatUptime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="admin-page animate-fade-in" id="admin-page">
      <div className="page-header">
        <h1>Admin Panel</h1>
        <p>Exchange engine statistics and equity market controls</p>
      </div>

      {stats && (
        <div className="grid-4 admin-stats">
          <StatsCard
            title="Orders Submitted"
            value={stats.total_orders_submitted.toLocaleString('en-IN')}
            subtitle="All Symbols"
            icon={<FileText size={20} />}
            variant="accent"
            trend="up"
            trendValue="Overall"
          />
          <StatsCard
            title="Trades Executed"
            value={stats.total_trades_executed.toLocaleString('en-IN')}
            subtitle="Matched Orders"
            icon={<Zap size={20} />}
            variant="accent"
            trend="up"
            trendValue="Overall"
          />
          <StatsCard
            title="Avg Order Latency"
            value={`${stats.avg_order_latency_ms.toFixed(3)}ms`}
            subtitle="Per order processing"
            icon={<Clock size={20} />}
            variant="accent"
            trend="up"
            trendValue="Stable"
          />
          <StatsCard
            title="Uptime"
            value={formatUptime(stats.uptime_seconds)}
            subtitle="Engine Status"
            icon={<Activity size={20} />}
            variant="buy"
            trend="up"
            trendValue="Live"
          />
        </div>
      )}

      {stats && (
        <div className="card admin-symbol-stats">
          <div className="card-header">
            <h2>Orders & Trades by Symbol</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Orders</th>
                <th>Trades</th>
                <th>Fill Rate</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(stats.orders_per_symbol).map(sym => {
                const orders = stats.orders_per_symbol[sym];
                const trades = stats.trades_per_symbol[sym] || 0;
                const fillRate = orders > 0 ? (trades / orders * 100).toFixed(1) : '0.0';
                return (
                  <tr key={sym}>
                    <td><span className="order-symbol">{sym}</span></td>
                    <td className="mono">{orders.toLocaleString('en-IN')}</td>
                    <td className="mono">{trades.toLocaleString('en-IN')}</td>
                    <td>
                      <div className="fill-rate">
                        <div className="fill-rate-bar">
                          <div className="fill-rate-fill" style={{ width: `${fillRate}%` }}></div>
                        </div>
                        <span className="mono">{fillRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-controls-row">
        <div className="card admin-market-control">
          <div className="card-header">
            <h2>Market Control</h2>
            <span className={`badge ${marketPaused ? 'badge-sell' : 'badge-buy'}`}>
              {marketPaused ? 'PAUSED' : 'RUNNING'}
            </span>
          </div>
          <p className="admin-description">
            Pause or resume the synthetic equity order generation engine.
          </p>
          <button
            className={`btn btn-lg ${marketPaused ? 'btn-primary' : 'btn-sell'}`}
            onClick={handlePauseResume}
            id="btn-pause-resume"
          >
            {marketPaused ? <><Play size={16} /> Resume Market</> : <><Pause size={16} /> Pause Market</>}
          </button>
        </div>

        <div className="card admin-gbm-params">
          <div className="card-header">
            <h2>GBM Parameters</h2>
            <span className="badge badge-accent">Price Simulation</span>
          </div>
          <p className="admin-description">
            Adjust the Geometric Brownian Motion drift and volatility for each stock.
          </p>
          <div className="gbm-params-grid">
            {Object.entries(gbmParams).map(([symbol, params]) => (
              <div className="gbm-param-row" key={symbol}>
                <span className="gbm-symbol">{symbol}</span>
                <div className="gbm-inputs">
                  <div className="gbm-input-group">
                    <label>Drift</label>
                    <input
                      type="number"
                      step="0.00001"
                      value={(params as any).mu}
                      onChange={e => setGbmParams(prev => ({
                        ...prev,
                        [symbol]: { ...(prev[symbol] as any), mu: parseFloat(e.target.value) || 0 }
                      }))}
                      className="mono"
                      id={`gbm-mu-${symbol.toLowerCase()}`}
                    />
                  </div>
                  <div className="gbm-input-group">
                    <label>Volatility</label>
                    <input
                      type="number"
                      step="0.001"
                      value={(params as any).sigma}
                      onChange={e => setGbmParams(prev => ({
                        ...prev,
                        [symbol]: { ...(prev[symbol] as any), sigma: parseFloat(e.target.value) || 0 }
                      }))}
                      className="mono"
                      id={`gbm-sigma-${symbol.toLowerCase()}`}
                    />
                  </div>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => handleUpdateParams(symbol)}
                    id={`btn-update-gbm-${symbol.toLowerCase()}`}
                  >
                    Update
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
