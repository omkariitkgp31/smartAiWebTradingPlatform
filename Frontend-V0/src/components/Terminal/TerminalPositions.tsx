'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, Package } from 'lucide-react';
import * as api from '../../services/api';

// Dummy holdings data as fallback
const DUMMY_HOLDINGS = [
  { asset_symbol: 'RELIANCE', quantity: 10, avg_cost_basis: 2510, market_value: 28500, mkt_price: 2850, pnl: 3400, pnl_pct: 13.55 },
  { asset_symbol: 'TCS', quantity: 5, avg_cost_basis: 3280, market_value: 17250, mkt_price: 3450, pnl: 850, pnl_pct: 5.18 },
  { asset_symbol: 'INFY', quantity: 20, avg_cost_basis: 1450, market_value: 31600, mkt_price: 1580, pnl: 2600, pnl_pct: 8.97 },
  { asset_symbol: 'HDFCBANK', quantity: 8, avg_cost_basis: 1620, market_value: 12320, mkt_price: 1540, pnl: -640, pnl_pct: -4.94 },
];

interface TerminalPositionsProps {
  focusSymbol?: string;
}

export default function TerminalPositions({ focusSymbol }: TerminalPositionsProps) {
  const [tab, setTab] = useState<'holdings' | 'positions'>('holdings');
  const [holdings, setHoldings] = useState<any[]>([]);

  const loadHoldings = useCallback(async () => {
    try {
      const data = await api.getHoldings();
      setHoldings(Array.isArray(data) && data.length > 0 ? data : DUMMY_HOLDINGS);
    } catch {
      setHoldings(DUMMY_HOLDINGS);
    }
  }, []);

  useEffect(() => {
    loadHoldings();
    const iv = window.setInterval(loadHoldings, 10000);
    return () => window.clearInterval(iv);
  }, [loadHoldings]);

  const inr = (val: number) => '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Sort focused symbol to top
  const sortedHoldings = [...holdings].sort((a, b) => {
    if (a.asset_symbol === focusSymbol) return -1;
    if (b.asset_symbol === focusSymbol) return 1;
    return 0;
  });

  return (
    <div className="positions-panel">
      <div className="positions-panel-title">My Portfolio</div>

      <div className="positions-tabs">
        <button className={`positions-tab ${tab === 'holdings' ? 'active' : ''}`} onClick={() => setTab('holdings')}>
          Holdings ({sortedHoldings.length})
        </button>
        <button className={`positions-tab ${tab === 'positions' ? 'active' : ''}`} onClick={() => setTab('positions')}>
          Positions
        </button>
      </div>

      {tab === 'holdings' && (
        sortedHoldings.length > 0 ? (
          sortedHoldings.map(h => {
            const isPos = (h.pnl || 0) >= 0;
            const isFocused = h.asset_symbol === focusSymbol;
            return (
              <div
                key={h.asset_symbol}
                className="position-card"
                style={isFocused ? { borderColor: 'rgba(99, 102, 241, 0.35)' } : undefined}
              >
                <div className="position-card-top">
                  <span className="position-symbol">{h.asset_symbol}</span>
                  <span className="position-qty">{h.quantity} shares</span>
                </div>
                <div className="position-card-bottom">
                  <div className="position-stat">
                    <span className="position-stat-label">Avg Cost</span>
                    <span className="position-stat-value">{inr(h.avg_cost_basis || 0)}</span>
                  </div>
                  <div className="position-stat">
                    <span className="position-stat-label">LTP</span>
                    <span className="position-stat-value">{inr(h.mkt_price || 0)}</span>
                  </div>
                  <div className="position-stat">
                    <span className="position-stat-label">P&L</span>
                    <span className={`position-stat-value ${isPos ? 'pos' : 'neg'}`}>
                      {isPos ? '+' : ''}{inr(h.pnl || 0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="positions-empty">
            <Briefcase size={28} />
            <p>No holdings yet</p>
          </div>
        )
      )}

      {tab === 'positions' && (
        <div className="positions-empty">
          <Package size={28} />
          <p>No open positions</p>
        </div>
      )}
    </div>
  );
}
