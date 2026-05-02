'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import CandlestickChart from '../CandlestickChart';
import * as api from '../../services/api';
import * as ws from '../../services/websocket';

interface TerminalChartProps {
  symbol: string;
  backendSymbol: string; // the actual backend symbol (e.g. RELIANCE mapped back)
  onPriceUpdate?: (price: number, change: number, changePct: number) => void;
  onOhlcvUpdate?: (ohlcv: { open: number; high: number; low: number; close: number; volume: number }) => void;
  onHoverCandle?: (candle: any) => void;
  activeTool?: string;
  interval?: string;
  command?: {cmd: string, ts: number} | null;
}

const INR_SCALE = 83.5;

export default function TerminalChart({ symbol, backendSymbol, onPriceUpdate, onOhlcvUpdate, onHoverCandle, activeTool, interval = '1m', command }: TerminalChartProps) {
  const [candles, setCandles] = useState<any[]>([]);
  const [ohlcv, setOhlcv] = useState<{ open: number; high: number; low: number; close: number; volume: number } | null>(null);
  const intervalRef = useRef(interval);
  intervalRef.current = interval;

  const loadCandles = useCallback(async () => {
    try {
      if (!backendSymbol) return;
      const data = await api.getCandles(backendSymbol, interval);
      if (data?.length) {
        const scaled = data.map((c: any) => ({
          ...c,
          open: parseFloat((c.open * INR_SCALE).toFixed(2)),
          high: parseFloat((c.high * INR_SCALE).toFixed(2)),
          low: parseFloat((c.low * INR_SCALE).toFixed(2)),
          close: parseFloat((c.close * INR_SCALE).toFixed(2)),
        }));
        setCandles(scaled);
        const last = scaled[scaled.length - 1];
        const prev = scaled.length > 1 ? scaled[scaled.length - 2] : last;
        const o = {
          open: last.open,
          high: last.high,
          low: last.low,
          close: last.close,
          volume: last.volume || 0,
        };
        setOhlcv(o);
        onOhlcvUpdate?.(o);
        if (prev) {
          const diff = last.close - prev.close;
          onPriceUpdate?.(last.close, diff, prev.close > 0 ? (diff / prev.close) * 100 : 0);
        }
      }
    } catch { /* silent */ }
  }, [backendSymbol, interval, onPriceUpdate, onOhlcvUpdate]);

  useEffect(() => {
    loadCandles();
    const iv = window.setInterval(loadCandles, 30000);
    return () => window.clearInterval(iv);
  }, [loadCandles]);

  // WebSocket live price
  useEffect(() => {
    if (!backendSymbol) return;
    ws.connect();
    ws.subscribe(backendSymbol);
    const unsub = ws.onMessage((msg: any) => {
      if (msg.type === 'TRADE_PRINT' && msg.symbol === backendSymbol) {
        const price = Number(msg.price) * INR_SCALE;
        onPriceUpdate?.(price, 0, 0);
        if (['1m', '5m', '1s', '5s'].includes(intervalRef.current)) {
          setCandles(prev => {
            if (!prev?.length) return prev;
            const updated = [...prev];
            const last = { ...updated[updated.length - 1] };
            last.close = price;
            if (price > last.high) last.high = price;
            if (price < last.low) last.low = price;
            updated[updated.length - 1] = last;
            return updated;
          });
        }
      }
    });
    return () => { unsub(); };
  }, [backendSymbol, onPriceUpdate]);

  return (
    <>
      {/* OHLCV Info Bar */}
      {ohlcv && (
        <div className="terminal-ohlcv-bar">
          <div className="ohlcv-item">
            <span className="ohlcv-label">O</span>
            <span className="ohlcv-value neutral">₹{ohlcv.open.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="ohlcv-item">
            <span className="ohlcv-label">H</span>
            <span className="ohlcv-value pos">₹{ohlcv.high.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="ohlcv-item">
            <span className="ohlcv-label">L</span>
            <span className="ohlcv-value neg">₹{ohlcv.low.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="ohlcv-item">
            <span className="ohlcv-label">C</span>
            <span className={`ohlcv-value ${ohlcv.close >= ohlcv.open ? 'pos' : 'neg'}`}>
              ₹{ohlcv.close.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="ohlcv-item">
            <span className="ohlcv-label">Vol</span>
            <span className="ohlcv-value neutral">
              {ohlcv.volume >= 1_000_000 ? (ohlcv.volume / 1_000_000).toFixed(2) + 'M'
                : ohlcv.volume >= 1_000 ? (ohlcv.volume / 1_000).toFixed(1) + 'K'
                  : ohlcv.volume.toString()}
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="terminal-chart-area">
        <CandlestickChart
          candles={candles}
          interval={interval}
          onIntervalChange={() => {}}
          symbol={symbol}
          activeTool={activeTool}
          onHoverCandle={onHoverCandle}
          command={command}
          hideTooltip={true}
        />
      </div>
    </>
  );
}
