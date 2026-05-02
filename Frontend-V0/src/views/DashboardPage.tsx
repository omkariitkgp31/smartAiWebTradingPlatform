'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import * as api from '../services/api';
import * as ws from '../services/websocket';
import CandlestickChart from '../components/CandlestickChart';
import OrderBook from '../components/OrderBook';
import OrderPanel from '../components/OrderPanel';
import TradeHistory from '../components/TradeHistory';
import './DashboardPage.css';

export default function DashboardPage() {
  const { selectedSymbol, setMarketStats, isOrderActive, setIsOrderActive } = useMarket();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [candles, setCandles] = useState([]);
  const [orderBook, setOrderBook] = useState(null);
  const [trades, setTrades] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [pnl, setPnl] = useState(null);
  const [candleInterval, setCandleInterval] = useState('1m');
  const [currentPrice, setCurrentPrice] = useState(0);

  const selectedSymbolRef = useRef(selectedSymbol);
  selectedSymbolRef.current = selectedSymbol;
  const candleIntervalRef = useRef(candleInterval);
  candleIntervalRef.current = candleInterval;

  // Compute and lift market stats from candle data
  useEffect(() => {
    if (!candles?.length) return;
    const high24h = Math.max(...candles.map(c => c.high));
    const low24h = Math.min(...candles.map(c => c.low));
    const volume = candles.reduce((s, c) => s + (c.volume || 0), 0);
    setMarketStats({ high24h, low24h, volume });
  }, [candles, setMarketStats]);

  const loadData = useCallback(async () => {
    if (!selectedSymbol) return;
    try {
      const [candleData, obData, tradeData, portfolioData, holdingsData, pnlData] = await Promise.all([
        api.getCandles(selectedSymbol, candleInterval),
        api.getOrderBook(selectedSymbol),
        api.getPublicTrades(),
        api.getPortfolio(),
        api.getHoldings(),
        api.getPnL(),
      ]);
      setCandles(candleData || []);
      setOrderBook(obData);
      setTrades(tradeData || []);
      setPortfolio(portfolioData);
      setHoldings(holdingsData || []);
      setPnl(pnlData);
      if (obData?.mid_price) setCurrentPrice(obData.mid_price);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, [selectedSymbol, candleInterval]);

  useEffect(() => {
    if (!selectedSymbol) return;

    ws.connect();
    ws.subscribe(selectedSymbol);

    const unsub = ws.onMessage((msg) => {
      switch (msg.type) {
        case 'TRADE_PRINT': {
          const sym = msg.symbol;
          const price = Number(msg.price);
          const qty = Number(msg.qty);

          if (sym === selectedSymbolRef.current) {
            setCurrentPrice(price);

            // ── Live candle update ──────────────────────────────────
            if (['1s', '5s', '1m', '5m'].includes(candleIntervalRef.current)) {
              const intervalMs: Record<string, number> = { '1s': 1000, '5s': 5000, '1m': 60000, '5m': 300000 };
              setCandles(prev => {
                if (!prev || prev.length === 0) return prev;
                const updated = [...prev];
                const last = { ...updated[updated.length - 1] };
                const nowMs = Date.now();
                const closeTimeMs = last.close_time / 1_000_000;

                if (nowMs >= closeTimeMs) {
                  // Current candle period has ended — start a new one
                  // Open must equal previous close for a gapless chart
                  const openPrice = last.close;
                  updated[updated.length - 1] = last;
                  const durMs = intervalMs[candleIntervalRef.current] || 60000;
                  const newOpen = last.close_time; // nanoseconds
                  updated.push({
                    open: openPrice,
                    high: Math.max(openPrice, price),
                    low: Math.min(openPrice, price),
                    close: price,
                    volume: qty,
                    open_time: newOpen,
                    close_time: newOpen + durMs * 1_000_000,
                  });
                  if (updated.length > 300) updated.shift();
                } else {
                  last.close = price;
                  if (price > last.high) last.high = price;
                  if (price < last.low) last.low = price;
                  last.volume = (last.volume || 0) + qty;
                  updated[updated.length - 1] = last;
                }
                return updated;
              });
            }
          }

          setTrades(prev => [{
            id: 'live-' + Date.now() + Math.random(),
            asset_symbol: sym,
            price,
            quantity: qty,
            aggressor_side: msg.side,
            executed_at: Date.now() * 1_000_000,
          }, ...prev].slice(0, 100));
          break;
        }

        case 'FILL_CONFIRM':
          api.getPortfolio().then(setPortfolio).catch(() => { });
          api.getHoldings().then(setHoldings).catch(() => { });
          api.getPnL().then(setPnl).catch(() => { });
          break;

        case 'ORDER_REJECT':
          console.warn('Order rejected:', msg.error, msg.client_order_id);
          break;

        default:
          break;
      }
    });

    const obPoll = setInterval(() => {
      api.getOrderBook(selectedSymbolRef.current)
        .then(ob => {
          setOrderBook(ob);
          if (ob?.mid_price) setCurrentPrice(ob.mid_price);
        })
        .catch(() => { });
    }, 3000);

    const pnlPoll = setInterval(() => {
      api.getPortfolio().then(setPortfolio).catch(() => { });
      api.getPnL().then(setPnl).catch(() => { });
      api.getHoldings().then(setHoldings).catch(() => { });
    }, 10000);

    // Poll candles every 60s to pick up freshly flushed candles from the backend
    // DISABLED for C++ engine integration: fetching REST candles overwrites the live WebSocket
    // chart. The live chart now draws tick-by-tick from TRADE_PRINT events.
    /*
    const candlePoll = setInterval(() => {
      api.getCandles(selectedSymbolRef.current, candleIntervalRef.current)
        .then(data => { if (data?.length) setCandles(data); })
        .catch(() => { });
    }, 60000);
    */

    const tradePoll = setInterval(() => {
      api.getPublicTrades()
        .then(data => { if (data?.length) setTrades(data); })
        .catch(() => { });
    }, 5000);

    return () => {
      unsub();
      clearInterval(obPoll);
      clearInterval(pnlPoll);
      // clearInterval(candlePoll);
      clearInterval(tradePoll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitOrder = async (order) => {
    const result = await api.submitOrder(order);
    loadData();
    return result;
  };

  if (!selectedSymbol) return null;

  return (
    <div className={`dashboard-page ${isFullscreen ? 'is-fullscreen' : ''}`} id="dashboard-page">
      <div className={`dashboard-grid ${isOrderActive ? 'order-active' : ''}`}>
        <div className={`dashboard-chart ${isFullscreen && showOrderPanel ? 'panel-open' : ''}`}>
          <CandlestickChart
            candles={candles}
            interval={candleInterval}
            onIntervalChange={setCandleInterval}
            symbol={selectedSymbol}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(prev => !prev)}
            extraControls={
              isFullscreen && !showOrderPanel && (
                <button
                  onClick={() => setShowOrderPanel(true)}
                  className="dashboard-fs-place-order-btn"
                >
                  Place Order
                </button>
              )
            }
          />
        </div>

        <div className="dashboard-orderbook">
          <OrderBook orderBook={orderBook} />
        </div>

        <div className="dashboard-trades">
          <TradeHistory trades={trades} symbol={selectedSymbol} />
        </div>

        <div className="dashboard-order-panel">
          <OrderPanel
            symbol={selectedSymbol}
            currentPrice={currentPrice}
            onSubmitOrder={handleSubmitOrder}
            cashBalance={portfolio?.cash_balance}
            onClose={() => setIsOrderActive(false)}
          />
        </div>


      </div>

      {/* Fullscreen Sliding Order Panel */}
      {isFullscreen && (
        <div className={`dashboard-fs-order-drawer ${showOrderPanel ? 'open' : ''}`}>
          <OrderPanel
            symbol={selectedSymbol}
            currentPrice={currentPrice}
            onSubmitOrder={handleSubmitOrder}
            cashBalance={portfolio?.cash_balance}
            onClose={() => setShowOrderPanel(false)}
          />
        </div>
      )}
    </div>
  );
}
