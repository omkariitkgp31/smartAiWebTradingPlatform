'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize, X } from 'lucide-react';
import ChartEngine from '../chart/ChartEngine';
import { computeSMA, computeEMA } from '../chart/computeIndicators';
import { useMarket } from '../context/MarketContext';
import './CandlestickChart.css';

const INTERVALS = ['1s', '5s', '1m', '5m'];

export default function CandlestickChart({ candles, interval, onIntervalChange, symbol, isFullscreen, onToggleFullscreen, extraControls, activeTool, onHoverCandle, command, hideTooltip }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<any>(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const { assets, symbolLoading } = useMarket();

  // Get company name for subtitle
  const currentAsset = assets?.find(a => a.symbol === symbol);
  const companyName = currentAsset?.name || '';

  const handleTooltip = useCallback((data) => {
    setTooltipData(data);
    if (onHoverCandle) {
      onHoverCandle(data?.candle || null);
    }
  }, [onHoverCandle]);

  // Fullscreen effect logic moved to parent DashboardPage, 
  // but we still want resize event when it toggles.
  useEffect(() => {
    if (engineRef.current) {
      setTimeout(() => engineRef.current.resize(), 50);
    }
  }, [isFullscreen]);

  // Create/destroy engine on mount/unmount
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new ChartEngine(containerRef.current, {
      onTooltip: handleTooltip,
    });
    engineRef.current = engine;

    const ro = new ResizeObserver(() => {
      engine.resize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleTooltip]);

  // Update data when candles change
  useEffect(() => {
    if (!engineRef.current || !candles?.length) return;
    engineRef.current.setData(candles);

    const sma = computeSMA(candles, 20);
    const ema = computeEMA(candles, 50);
    engineRef.current.setIndicators(sma, ema);
  }, [candles]);

  // Sync activeTool state
  useEffect(() => {
    if (engineRef.current && activeTool) {
      engineRef.current.setActiveTool(activeTool);
    }
  }, [activeTool]);

  // Update MA visibility
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.showSMA = showSMA;
    engineRef.current.showEMA = showEMA;
    engineRef.current.renderMain();
  }, [showSMA, showEMA]);

  // Refresh theme when it changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (engineRef.current) engineRef.current.refreshTheme();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  // Handle command (undo, redo, clear, snapshot)
  useEffect(() => {
    if (engineRef.current && command) {
      const { cmd } = command;
      if (cmd === 'undo' && engineRef.current.undo) {
        engineRef.current.undo();
      } else if (cmd === 'redo' && engineRef.current.redo) {
        engineRef.current.redo();
      } else if (cmd === 'deleteAll' && engineRef.current.clearDrawings) {
        engineRef.current.clearDrawings();
      } else if (cmd === 'snapshot') {
        try {
          const mainCanvas = engineRef.current.mainCanvas;
          if (mainCanvas) {
             const url = mainCanvas.toDataURL('image/png');
             const a = document.createElement('a');
             a.href = url;
             a.download = `chart-snapshot-${symbol}.png`;
             a.click();
          }
        } catch (e) {
          console.error("Failed to take snapshot", e);
        }
      }
    }
  }, [command, symbol]);

  const formatPrice = (p: any) => {
    return '₹' + p.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatTime = (nanos) => {
    const d = new Date(Math.floor(nanos / 1_000_000));
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  };

  const formatVolume = (v) => {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
    if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
    return v?.toString() ?? '0';
  };

  const tooltipCandle = tooltipData?.candle;
  const isUp = tooltipCandle ? tooltipCandle.close >= tooltipCandle.open : true;

  return (
    <div className={`chart-container card`} id="candlestick-chart">
      <div className="chart-header">
        <div className="chart-title">
          <div className="chart-title-row">
            <h3 className="chart-symbol">{symbol}</h3>
            {companyName && <span className="chart-company-name">{companyName}</span>}
          </div>
          <span className="chart-subtitle">Candlestick · Stock Chart</span>
        </div>
        <div className="chart-controls">
          {extraControls}
          <div className="ma-toggles">
            <label className="ma-toggle">
              <input type="checkbox" checked={showSMA} onChange={(e) => setShowSMA(e.target.checked)} />
              <span className="ma-label ma-sma">SMA 20</span>
            </label>
            <label className="ma-toggle">
              <input type="checkbox" checked={showEMA} onChange={(e) => setShowEMA(e.target.checked)} />
              <span className="ma-label ma-ema">EMA 50</span>
            </label>
          </div>
          <div className="interval-tabs">
            {INTERVALS.map(iv => (
              <button
                key={iv}
                className={`interval-tab ${interval === iv ? 'active' : ''}`}
                onClick={() => onIntervalChange(iv)}
                id={`interval-${iv}`}
              >
                {iv}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`chart-body ${symbolLoading ? 'chart-loading' : ''}`} ref={containerRef}>
        {/* Fullscreen Toggle Button */}
        {!symbolLoading && (
          <button
            className={`chart-fullscreen-btn ${isFullscreen ? 'is-fullscreen' : ''}`}
            onClick={() => onToggleFullscreen && onToggleFullscreen()}
            aria-label="Toggle Fullscreen"
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}
          >
            {isFullscreen ? <X size={15} /> : <Maximize size={15} />}
          </button>
        )}

        {symbolLoading && (
          <div className="chart-skeleton-overlay">
            <div className="skeleton-bars">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton-bar"
                  style={{ height: `${30 + Math.random() * 50}%`, animationDelay: `${i * 40}ms` }}
                />
              ))}
            </div>
            <div className="skeleton-label">Loading {symbol}…</div>
          </div>
        )}

        {/* Tooltip overlay */}
        {!symbolLoading && tooltipCandle && tooltipData && !hideTooltip && (
          <div
            className="chart-tooltip"
            style={{
              left: Math.min(tooltipData.x, (containerRef.current?.clientWidth || 400) - 220),
              top: Math.max(8, tooltipData.y - 120),
            }}
          >
            <div className="tooltip-time">{formatTime(tooltipCandle.open_time)}</div>
            <div className="tooltip-grid">
              <div className="tooltip-row">
                <span className="tooltip-dot" style={{ background: isUp ? 'var(--color-buy)' : 'var(--color-sell)' }} />
                <span className="tooltip-label">Open</span>
                <span className="tooltip-value mono">{formatPrice(tooltipCandle.open)}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-dot" style={{ background: 'var(--color-buy)' }} />
                <span className="tooltip-label">High</span>
                <span className="tooltip-value mono">{formatPrice(tooltipCandle.high)}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-dot" style={{ background: 'var(--color-sell)' }} />
                <span className="tooltip-label">Low</span>
                <span className="tooltip-value mono">{formatPrice(tooltipCandle.low)}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-dot" style={{ background: isUp ? 'var(--color-buy)' : 'var(--color-sell)' }} />
                <span className="tooltip-label">Close</span>
                <span className="tooltip-value mono">{formatPrice(tooltipCandle.close)}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-dot" style={{ background: 'var(--accent)' }} />
                <span className="tooltip-label">Vol</span>
                <span className="tooltip-value mono">{formatVolume(tooltipCandle.volume)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
