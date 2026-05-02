import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import './StatsCard.css';

export default function StatsCard({ title, value, subtitle, icon, trend, trendValue, variant = 'default' }) {
  const isPositive = trend === 'up';
  const variantClass = variant === 'accent' ? 'stats-card-accent' :
                       variant === 'buy' ? 'stats-card-buy' :
                       variant === 'sell' ? 'stats-card-sell' : '';

  return (
    <div className={`stats-card card ${variantClass}`}>
      <div className="stats-card-top">
        <div className="stats-card-info">
          <span className="stats-card-title">{title}</span>
          <span className="stats-card-value mono">{value}</span>
          {subtitle && <span className="stats-card-subtitle">{subtitle}</span>}
        </div>
        {icon && <div className="stats-card-icon">{icon}</div>}
      </div>
      {trendValue !== undefined && (
        <div className={`stats-card-trend ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
