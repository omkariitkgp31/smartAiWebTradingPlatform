'use client';

import React from 'react';
import { Sun, Moon, Wifi, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useMarket } from '../context/MarketContext';
import StockSelector from './StockSelector';
import './Navbar.css';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { selectedSymbol, assets, marketStats, setIsOrderActive } = useMarket();

  const currentAsset = assets?.find(a => a.symbol === selectedSymbol);
  const stats = marketStats || {};

  const priceChange = (() => {
    if (!currentAsset) return 0;
    const initial = currentAsset.initial_price || currentAsset.current_price;
    if (!initial) return 0;
    return ((currentAsset.current_price - initial) / initial) * 100;
  })();
  const isPositive = priceChange >= 0;

  return (
    <header className="navbar" id="main-navbar">


      {/* Stock selector takes up the bulk of the bar */}
      <div className="navbar-selector">
        <StockSelector />
      </div>

      <button 
        className="navbar-place-order-btn"
        onClick={() => setIsOrderActive(true)}
      >
        <Zap size={14} /> Place Order
      </button>

      {/* Right-side stats */}
      <div className="navbar-right">
        {currentAsset && (
          <div className="price-display">
            <span className="current-price mono">
              ₹{currentAsset.current_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
            </span>
          </div>
        )}

        <div className="navbar-stat">
          <span className="stat-label">Vol</span>
          <span className="stat-value mono">
            {stats.volume != null
              ? (stats.volume >= 1_000_000
                  ? `${(stats.volume / 1_000_000).toFixed(1)}M`
                  : stats.volume >= 1_000
                    ? `${(stats.volume / 1_000).toFixed(0)}K`
                    : stats.volume.toFixed(0))
              : '--'}
          </span>
        </div>
        <div className="navbar-stat">
          <span className="stat-label">Hi</span>
          <span className="stat-value mono text-buy">
            {stats.high24h != null ? `₹${stats.high24h.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '--'}
          </span>
        </div>
        <div className="navbar-stat">
          <span className="stat-label">Lo</span>
          <span className="stat-value mono text-sell">
            {stats.low24h != null ? `₹${stats.low24h.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '--'}
          </span>
        </div>

        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme" id="btn-theme-toggle">
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );
}
