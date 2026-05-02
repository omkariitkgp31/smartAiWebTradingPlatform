import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import './PortfolioWidget.css';

export default function PortfolioWidget({ portfolio, holdings, pnl, compact = false }) {
  const totalValue = (portfolio?.cash_balance || 0) +
    (holdings?.reduce((sum, h) => sum + h.market_value, 0) || 0);

  const totalPnl = pnl?.total_pnl != null
    ? pnl.total_pnl
    : ((portfolio?.realized_pnl ?? 0) + (portfolio?.unrealized_pnl ?? 0));
  const pnlPercent = totalValue > 0 ? (totalPnl / (totalValue - totalPnl) * 100) : 0;
  const isPositive = totalPnl >= 0;

  if (compact) {
    return (
      <div className="portfolio-compact card" id="portfolio-widget-compact">
        <div className="compact-header">
          <span className="compact-label">Portfolio</span>
          <span className={`compact-pnl ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
          </span>
        </div>
        <div className="compact-value mono">
          ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="compact-details">
          <div className="compact-detail">
            <span className="detail-label">Cash</span>
            <span className="detail-value mono">₹{portfolio?.cash_balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
          </div>
          <div className="compact-detail">
            <span className="detail-label">P&amp;L</span>
            <span className={`detail-value mono ${isPositive ? 'text-buy' : 'text-sell'}`}>
              {isPositive ? '+' : ''}₹{totalPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-widget" id="portfolio-widget-full">
      <div className="portfolio-hero card">
        <div className="hero-top">
          <div>
            <div className="hero-label">Total Portfolio Value</div>
            <div className="hero-value mono">
              ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className={`hero-badge ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
          </div>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-label">Cash Balance</span>
            <span className="hero-stat-value mono">₹{portfolio?.cash_balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-label">Realized P&amp;L</span>
            <span className={`hero-stat-value mono ${(pnl?.realized_pnl || 0) >= 0 ? 'text-buy' : 'text-sell'}`}>
              {(pnl?.realized_pnl || 0) >= 0 ? '+' : ''}₹{(pnl?.realized_pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-label">Unrealized P&amp;L</span>
            <span className={`hero-stat-value mono ${(pnl?.unrealized_pnl || 0) >= 0 ? 'text-buy' : 'text-sell'}`}>
              {(pnl?.unrealized_pnl || 0) >= 0 ? '+' : ''}₹{(pnl?.unrealized_pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-label">Total P&amp;L</span>
            <span className={`hero-stat-value mono ${isPositive ? 'text-buy' : 'text-sell'}`}>
              {isPositive ? '+' : ''}₹{totalPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {holdings && holdings.length > 0 && (
        <div className="holdings-section card">
          <div className="card-header">
            <h3>Positions</h3>
            <span className="badge badge-accent">{holdings.length} positions</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Shares</th>
                <th>Avg Cost</th>
                <th>Market Value</th>
                <th>P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => {
                const holdingPnl = h.market_value - (h.avg_cost_basis * h.quantity);
                const holdingPnlPct = h.avg_cost_basis > 0 ? (holdingPnl / (h.avg_cost_basis * h.quantity) * 100) : 0;
                return (
                  <tr key={h.asset_symbol}>
                    <td>
                      <span className="holding-symbol">{h.asset_symbol}</span>
                    </td>
                    {/* Whole shares — no decimal */}
                    <td className="mono">{Number.isInteger(h.quantity) ? h.quantity : h.quantity.toLocaleString()}</td>
                    <td className="mono">₹{h.avg_cost_basis.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="mono">₹{h.market_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className={`mono ${holdingPnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                      {holdingPnl >= 0 ? '+' : ''}₹{holdingPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span className="holding-pnl-pct"> ({holdingPnlPct.toFixed(2)}%)</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
