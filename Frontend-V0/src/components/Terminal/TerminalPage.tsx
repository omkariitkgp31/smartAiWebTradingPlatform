'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Search, ShoppingCart, Layers, Briefcase, ChevronDown,
  BarChart2, Wallet, List, BarChart3,
  MousePointer, Crosshair, TrendingUp as TrendLine, Minus, ArrowUpRight,
  PenTool, Type, Circle, Square, Scissors, Eraser, Trash2, Hash,
  Undo2, Redo2, Camera, Maximize, Settings, Eye, Magnet
} from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import TerminalChart from './TerminalChart';
import MarketDepth from './MarketDepth';
import TerminalOrderPanel from './TerminalOrderPanel';
import TerminalPositions from './TerminalPositions';
import TerminalOrderHistory from './TerminalOrderHistory';
import './TerminalPage.css';

type RightTab = 'orders' | 'depth' | 'holdings' | 'history' | 'positions' | 'watchlist' | 'balance';

// Drawing tool definitions
const DRAWING_TOOLS = [
  { id: 'cursor', icon: <MousePointer size={16} />, label: 'Cursor', group: 'pointer' },
  { id: 'crosshair', icon: <Crosshair size={16} />, label: 'Crosshair', group: 'pointer' },
  { id: 'separator1', group: 'sep' },
  { id: 'trendline', icon: <TrendLine size={16} />, label: 'Trend Line', group: 'lines' },
  { id: 'horizontal', icon: <Minus size={16} />, label: 'Horizontal Line', group: 'lines' },
  { id: 'ray', icon: <ArrowUpRight size={16} />, label: 'Ray', group: 'lines' },
  { id: 'separator2', group: 'sep' },
  { id: 'fibonacci', icon: <Hash size={16} />, label: 'Fibonacci Retracement', group: 'fib' },
  { id: 'separator3', group: 'sep' },
  { id: 'rectangle', icon: <Square size={16} />, label: 'Rectangle', group: 'shapes' },
  { id: 'circle', icon: <Circle size={16} />, label: 'Circle', group: 'shapes' },
  { id: 'separator4', group: 'sep' },
  { id: 'pen', icon: <PenTool size={16} />, label: 'Freehand Draw', group: 'draw' },
  { id: 'text', icon: <Type size={16} />, label: 'Text', group: 'draw' },
  { id: 'separator5', group: 'sep' },
  { id: 'measure', icon: <Scissors size={16} />, label: 'Measure', group: 'tools' },
  { id: 'magnet', icon: <Magnet size={16} />, label: 'Magnet Mode', group: 'tools' },
  { id: 'separator6', group: 'sep' },
  { id: 'eraser', icon: <Eraser size={16} />, label: 'Eraser', group: 'delete' },
  { id: 'deleteAll', icon: <Trash2 size={16} />, label: 'Delete All Drawings', group: 'delete' },
];

// Stock data for search
const ALL_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', color: '#f59e0b' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', color: '#3b82f6' },
  { symbol: 'INFY', name: 'Infosys Limited', color: '#8b5cf6' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', color: '#22c55e' },
  { symbol: 'WIPRO', name: 'Wipro Limited', color: '#ec4899' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', color: '#06b6d4' },
  { symbol: 'SBIN', name: 'State Bank of India', color: '#eab308' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', color: '#ef4444' },
];

const INTERVALS = ['5y', '1y', '3m', '1m', '5d', '1d'];

interface TerminalPageProps {
  stock: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
  };
  onClose: () => void;
}

export default function TerminalPage({ stock, onClose }: TerminalPageProps) {
  const { assets } = useMarket();
  const [activeTab, setActiveTab] = useState<RightTab>('orders');
  const [currentSymbol, setCurrentSymbol] = useState(stock.symbol);
  const [currentName, setCurrentName] = useState(stock.name);
  const [livePrice, setLivePrice] = useState(stock.price);
  const [priceChange, setPriceChange] = useState(stock.change);
  const [priceChangePct, setPriceChangePct] = useState(stock.changePercent);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeTool, setActiveTool] = useState('cursor');
  const [selectedInterval, setSelectedInterval] = useState('5m');
  const [hoveredCandle, setHoveredCandle] = useState<any>(null);
  const [chartCommand, setChartCommand] = useState<{cmd: string, ts: number} | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Map display symbol to backend symbol
  const CHART_TO_ASSET: Record<string, string> = {
    RELIANCE: assets[0]?.symbol || 'RELIANCE',
    TCS: assets[1]?.symbol || 'TCS',
    INFY: assets[2]?.symbol || 'INFY',
    HDFCBANK: assets[0]?.symbol || 'RELIANCE',
    WIPRO: assets[1]?.symbol || 'TCS',
  };
  const backendSymbol = CHART_TO_ASSET[currentSymbol] || assets[0]?.symbol || 'RELIANCE';

  const stockMeta = ALL_STOCKS.find(s => s.symbol === currentSymbol);
  const stockColor = stockMeta?.color || '#6366f1';

  // Escape to go back
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Close search on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handlePriceUpdate = useCallback((price: number, change: number, changePct: number) => {
    if (price > 0) setLivePrice(price);
    if (change !== 0) setPriceChange(change);
    if (changePct !== 0) setPriceChangePct(changePct);
  }, []);

  const handleSwitchStock = (s: typeof ALL_STOCKS[0]) => {
    setCurrentSymbol(s.symbol);
    setCurrentName(s.name);
    setShowSearch(false);
    setSearchTerm('');
    setHoveredCandle(null);
  };

  const filteredStocks = ALL_STOCKS.filter(s =>
    s.symbol !== currentSymbol &&
    (s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const displayOpen = hoveredCandle ? hoveredCandle.open : livePrice;
  const displayHigh = hoveredCandle ? hoveredCandle.high : (livePrice * 1.005);
  const displayLow = hoveredCandle ? hoveredCandle.low : (livePrice * 0.995);
  const displayClose = hoveredCandle ? hoveredCandle.close : livePrice;
  const displayVol = hoveredCandle ? hoveredCandle.volume : 118350;
  const hIsPositive = displayClose >= displayOpen;

  const isPositive = priceChange >= 0;

  const handleCommand = (cmd: string) => {
    setChartCommand({ cmd, ts: Date.now() });
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const RIGHT_TABS: { key: RightTab; label: string; icon: React.ReactNode }[] = [
    { key: 'positions', label: 'Positions', icon: <BarChart2 size={15} /> },
    { key: 'orders', label: 'Orders', icon: <ShoppingCart size={15} /> },
    { key: 'watchlist', label: 'Watchlist', icon: <List size={15} /> },
    { key: 'depth', label: 'Depth', icon: <Layers size={15} /> },
    { key: 'holdings', label: 'Holdings', icon: <Briefcase size={15} /> },
    { key: 'balance', label: 'Balance', icon: <Wallet size={15} /> },
  ];

  return (
    <div className="terminal-view">
      {/* ── Top Market Ticker ──────────────────────── */}
      <div className="terminal-ticker-bar">
        {/* <div className="ticker-items">
          <span className="ticker-item">NIFTY <span className="ticker-val">22,713.10</span> <span className="ticker-chg pos">33.70 (+0.15%)</span></span>
          <span className="ticker-sep" />
          <span className="ticker-item">SENSEX <span className="ticker-val">73,319.55</span> <span className="ticker-chg pos">185.23 (+0.25%)</span></span>
          <span className="ticker-sep" />
          <span className="ticker-item">BANK NIFTY <span className="ticker-val">48,250.30</span> <span className="ticker-chg pos">126.45 (+0.26%)</span></span>
          <span className="ticker-sep" />
          <span className="ticker-item">NIFTY IT <span className="ticker-val">34,820.15</span> <span className="ticker-chg neg">-42.30 (-0.12%)</span></span>
        </div> */}
      </div>

      {/* ── Chart Toolbar ─────────────────────────── */}
      <div className="terminal-chart-toolbar">
        <div className="toolbar-left">
          <button className="terminal-back-btn" onClick={onClose} title="Back to Watchlist (Esc)">
            <ArrowLeft size={16} />
          </button>

          {/* Symbol search */}
          <div className="toolbar-symbol-search" ref={searchRef}>
            <button className="toolbar-symbol-btn" onClick={() => setShowSearch(!showSearch)}>
              <Search size={13} />
              <span className="toolbar-symbol-name">{currentSymbol}</span>
              <ChevronDown size={12} />
            </button>
            {showSearch && (
              <div className="toolbar-search-dropdown">
                <input
                  autoFocus
                  placeholder="Search Stocks, F&O, Indices etc."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="toolbar-search-input"
                />
                {filteredStocks.length > 0 && (
                  <div className="toolbar-search-results">
                    {filteredStocks.map(s => (
                      <div
                        key={s.symbol}
                        className="toolbar-search-item"
                        onClick={() => handleSwitchStock(s)}
                      >
                        <div className="sr-icon-sm" style={{ background: s.color }}>{s.symbol[0]}</div>
                        <div className="sr-info">
                          <span className="sr-symbol">{s.symbol}</span>
                          <span className="sr-name">{s.name}</span>
                        </div>
                        {/* <span className="sr-exchange">NSE</span> */}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interval selector */}
          <div className="toolbar-intervals">
            <span className="toolbar-interval-active">{selectedInterval}</span>
            <ChevronDown size={11} />
          </div>

          {/* Indicators */}
          {/* <button className="toolbar-btn" title="Indicators">
            <BarChart3 size={14} />
            <span>Indicators</span>
          </button> */}
        </div>

        <div className="toolbar-center">
          {/* Buy / Sell quick buttons */}
          {/* <button className="toolbar-buy-btn" onClick={() => setActiveTab('orders')}>B</button>
          <button className="toolbar-sell-btn" onClick={() => setActiveTab('orders')}>S</button> */}
        </div>

        <div className="toolbar-right">
          <button className="toolbar-icon-btn" title="Undo" onClick={() => handleCommand('undo')}><Undo2 size={14} /></button>
          <button className="toolbar-icon-btn" title="Redo" onClick={() => handleCommand('redo')}><Redo2 size={14} /></button>
          <button className="toolbar-icon-btn" title="Snapshot" onClick={() => handleCommand('snapshot')}><Camera size={14} /></button>
          <button className="toolbar-icon-btn" title="Fullscreen" onClick={handleFullscreen}><Maximize size={14} /></button>
          <button className="toolbar-icon-btn" title="Settings"><Settings size={14} /></button>
        </div>
      </div>

      {/* ── OHLCV Info Row ────────────────────────── */}
      <div className="terminal-ohlcv-row">
        <span className="ohlcv-symbol-label">{currentSymbol} · {selectedInterval} · NSE</span>
        <span className="ohlcv-data">O<span className="ohlcv-val">{displayOpen.toFixed(2)}</span></span>
        <span className="ohlcv-data">H<span className="ohlcv-val pos">{displayHigh.toFixed(2)}</span></span>
        <span className="ohlcv-data">L<span className="ohlcv-val neg">{displayLow.toFixed(2)}</span></span>
        <span className="ohlcv-data">C<span className={`ohlcv-val ${hIsPositive ? 'pos' : 'neg'}`}>{displayClose.toFixed(2)}</span></span>
        <span className="ohlcv-data">Vol<span className="ohlcv-val">{(displayVol >= 1000 ? (displayVol / 1000).toFixed(2) + 'K' : displayVol)}</span></span>
      </div>

      {/* ── Main Body ─────────────────────────────── */}
      <div className="terminal-body">
        {/* Left Drawing Tools Sidebar */}
        <div className="terminal-draw-tools">
          {DRAWING_TOOLS.map((tool) => {
            if (tool.group === 'sep') {
              return <div key={tool.id} className="draw-tool-separator" />;
            }
            if (tool.id === 'deleteAll') {
               return (
                 <button
                   key={tool.id}
                   className="draw-tool-btn"
                   onClick={() => handleCommand('deleteAll')}
                   title={tool.label}
                 >
                   {tool.icon}
                 </button>
               );
            }
            return (
              <button
                key={tool.id}
                className={`draw-tool-btn ${activeTool === tool.id ? 'active' : ''}`}
                onClick={() => setActiveTool(tool.id)}
                title={tool.label}
              >
                {tool.icon}
              </button>
            );
          })}
        </div>

        {/* Chart Area */}
        <div className="terminal-main">
          <TerminalChart
            symbol={currentSymbol}
            backendSymbol={backendSymbol}
            onPriceUpdate={handlePriceUpdate}
            activeTool={activeTool}
            onHoverCandle={setHoveredCandle}
            interval={selectedInterval}
            command={chartCommand}
          />
        </div>

        {/* Right Sidebar Panel Content */}
        <div className="terminal-right-panel">
          {/* Panel Header */}
          <div className="right-panel-header">
            <span className="right-panel-title">
              {RIGHT_TABS.find(t => t.key === activeTab)?.label || 'Orders'}
            </span>
            {activeTab === 'orders' && (
              <div className="right-panel-price-badge">
                <span className={`rpb-price ${isPositive ? 'pos' : 'neg'}`}>
                  ₹{livePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {' | '}
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePct.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>

          {/* Panel Content */}
          <div className="right-panel-content">
            {activeTab === 'orders' && (
              <TerminalOrderPanel symbol={currentSymbol} currentPrice={livePrice} />
            )}
            {activeTab === 'depth' && (
              <MarketDepth symbol={currentSymbol} backendSymbol={backendSymbol} />
            )}
            {activeTab === 'holdings' && (
              <TerminalPositions focusSymbol={currentSymbol} />
            )}
            {activeTab === 'history' && (
              <TerminalOrderHistory symbol={currentSymbol} />
            )}
            {activeTab === 'positions' && (
              <TerminalPositions focusSymbol={currentSymbol} />
            )}
            {activeTab === 'watchlist' && (
              <div className="panel-placeholder">
                <List size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p>Watchlist</p>
                <span className="panel-placeholder-sub">Your watchlist stocks will appear here</span>
              </div>
            )}
            {activeTab === 'balance' && (
              <div className="panel-placeholder">
                <Wallet size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p>Balance</p>
                <span className="panel-placeholder-sub">Account balance &amp; margin info</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Tab Bar (vertical, icon + label) */}
        <div className="terminal-right-tabs">
          {RIGHT_TABS.map(tab => (
            <button
              key={tab.key}
              className={`right-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              title={tab.label}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom Bar ────────────────────────────── */}
      <div className="terminal-bottom-bar">
        <div className="bottom-intervals">
          {INTERVALS.map(iv => (
            <button
              key={iv}
              className={`bottom-iv-btn ${selectedInterval === iv ? 'active' : ''}`}
              onClick={() => setSelectedInterval(iv)}
            >
              {iv}
            </button>
          ))}
        </div>
        <div className="bottom-info">
          <span className="bottom-time">01:00:45 UTC+5:30</span>
          <span className="bottom-sep">|</span>
          <span className="bottom-label">%</span>
          <span className="bottom-label">log</span>
          <span className="bottom-link">auto</span>
        </div>
      </div>
    </div>
  );
}
