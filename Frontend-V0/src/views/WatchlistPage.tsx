'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Edit2, X, Search, Check, BarChart2, Trash2, ArrowUpRight, ChevronUp, ChevronDown } from 'lucide-react';
import './WatchlistPage.css';
import TerminalPage from '../components/Terminal/TerminalPage';

// Dummy data for initial implementation
const INITIAL_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 173.50, change: 2.15, changePercent: 1.25, volume: '52.4M', volumeRaw: 52400000, low52w: 124.2, high52w: 198.2, trend: [170, 172, 171, 174, 173.5] },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 195.43, change: -5.20, changePercent: -2.59, volume: '112.1M', volumeRaw: 112100000, low52w: 152.4, high52w: 299.3, trend: [205, 200, 198, 196, 195.43] },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 885.20, change: 12.45, changePercent: 1.43, volume: '48.2M', volumeRaw: 48200000, low52w: 262.2, high52w: 974.0, trend: [860, 870, 865, 880, 885.2] },
  { symbol: 'MSFT', name: 'Microsoft', price: 418.66, change: -1.22, changePercent: -0.29, volume: '21.8M', volumeRaw: 21800000, low52w: 309.4, high52w: 430.8, trend: [422, 420, 421, 417, 418.66] },
  { symbol: 'AMZN', name: 'Amazon.com', price: 186.27, change: 3.12, changePercent: 1.70, volume: '42.9M', volumeRaw: 42900000, low52w: 132.9, high52w: 189.8, trend: [182, 183, 182, 187, 186.27] },
];

const ALL_STOCKS_POOL = [
  ...INITIAL_STOCKS,
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 152.12, change: 1.45, changePercent: 0.96, volume: '28.1M', volumeRaw: 28100000, low52w: 104.5, high52w: 160.2, trend: [148, 150, 151, 152.12] },
  { symbol: 'META', name: 'Meta Platforms', price: 485.35, change: -4.12, changePercent: -0.84, volume: '15.4M', volumeRaw: 15400000, low52w: 208.5, high52w: 520.4, trend: [490, 488, 487, 485.35] },
  { symbol: 'NFLX', name: 'Netflix', price: 625.50, change: 8.25, changePercent: 1.34, volume: '10.2M', volumeRaw: 10200000, low52w: 315.6, high52w: 640.2, trend: [610, 615, 620, 625.5] },
  { symbol: 'AMD', name: 'Advanced Micro Devices', price: 178.45, change: -2.35, changePercent: -1.30, volume: '62.4M', volumeRaw: 62400000, low52w: 81.2, high52w: 227.3, trend: [182, 180, 179, 178.45] },
  { symbol: 'INTC', name: 'Intel Corp.', price: 34.20, change: 0.55, changePercent: 1.63, volume: '45.1M', volumeRaw: 45100000, low52w: 24.8, high52w: 51.3, trend: [33, 33.5, 33.8, 34.2] },
];

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const width = 80;
  const height = 30;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / (range || 1)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="sparkline">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
};

const PerformanceBar = ({ low, high, current }: { low: number, high: number, current: number }) => {
  const percent = ((current - low) / (high - low)) * 100;
  return (
    <div className="perf-container">
      <span className="perf-value">{low.toFixed(1)}</span>
      <div className="perf-bar-wrapper">
        <div className="perf-bar-track"></div>
        <div className="perf-bar-fill" style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}></div>
        <div className="perf-bar-indicator" style={{ left: `${Math.min(Math.max(percent, 0), 100)}%` }}></div>
      </div>
      <span className="perf-value">{high.toFixed(1)}</span>
    </div>
  );
};

const WatchlistOrderPanel = ({ stock, onClose, onSubmitOrder }: { stock: any, onClose: () => void, onSubmitOrder: (o: any) => Promise<void> }) => {
  const [side, setSide] = useState('buy');
  const [orderType, setOrderType] = useState('limit');
  const [price, setPrice] = useState(stock.price?.toFixed(2) || '');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{type: string, message: string} | null>(null);

  // When stock changes, reset default price
  useEffect(() => {
    setPrice(stock.price?.toFixed(2) || '');
  }, [stock]);

  const total = price && quantity ? (parseFloat(price) * parseFloat(quantity)).toFixed(2) : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || (orderType !== 'market' && !price)) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const order = {
        asset_symbol: stock.symbol,
        type: orderType,
        side,
        price: orderType === 'market' ? 0 : parseFloat(price),
        quantity: parseFloat(quantity),
      };
      await onSubmitOrder(order);
      setFeedback({ type: 'success', message: `${side.toUpperCase()} order submitted!` });
      setQuantity('');
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Order failed. Try again.' });
    }
    setSubmitting(false);
  };

  return (
    <div className="watchlist-order-panel">
      <div className="card-header">
        <div className="panel-company-info">
          <div className="company-icon small" style={{ 
            backgroundColor: `rgba(${stock.change >= 0 ? '34, 197, 94' : '239, 68, 68'}, 0.1)`,
            color: stock.change >= 0 ? 'var(--color-buy)' : 'var(--color-sell)'
          }}>
            {stock.symbol[0]}
          </div>
          <div className="company-details">
            <h3 className="company-title">{stock.name}</h3>
            <span className="company-symbol-sub">{stock.symbol}</span>
          </div>
        </div>
        <button className="btn-close-panel" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="side-toggle">
        <button
          className={`side-btn buy-btn ${side === 'buy' ? 'active' : ''}`}
          onClick={() => setSide('buy')}
        >
          Buy
        </button>
        <button
          className={`side-btn sell-btn ${side === 'sell' ? 'active' : ''}`}
          onClick={() => setSide('sell')}
        >
          Sell
        </button>
      </div>

      <div className="order-type-tabs">
        {['limit', 'market'].map(t => (
          <button
            key={t}
            className={`order-type-tab ${orderType === t ? 'active' : ''}`}
            onClick={() => setOrderType(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="order-form">
        {orderType !== 'market' && (
          <div className="form-group">
            <label>Price (INR)</label>
            <div className="input-with-icon">
              <span className="input-icon">₹</span>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
                className="mono"
              />
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Shares</label>
          <input
            type="number"
            step="1"
            min="1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="0"
            className="mono"
          />
        </div>

        <div className="order-total">
          <span className="total-label">Estimated Total</span>
          <span className="total-value mono">₹{parseFloat(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>

        <button
          type="submit"
          className={`btn btn-lg order-submit-btn ${side === 'buy' ? 'btn-buy' : 'btn-sell'}`}
          disabled={submitting || !quantity}
        >
          {submitting ? 'Submitting...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${stock.symbol}`}
        </button>

        {feedback && (
          <div className={`order-feedback ${feedback.type}`}>
            {feedback.message}
          </div>
        )}
      </form>
    </div>
  );
};

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState([
    { name: 'Your Watchlist', stocks: INITIAL_STOCKS }
  ]);
  const [activeTab, setActiveTab] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddStocksModalOpen, setIsAddStocksModalOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStocks, setSelectedStocks] = useState<any[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isListVisible, setIsListVisible] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [selectedTradeStock, setSelectedTradeStock] = useState<any | null>(null);
  const [selectedTerminalStock, setSelectedTerminalStock] = useState<any | null>(null);
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const stockSearchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const activeWatchlist = watchlists[activeTab] || watchlists[0];

  const sortedStocks = useMemo(() => {
    let list = activeWatchlist.stocks.filter(stock => 
      stock.symbol.toLowerCase().includes(tableSearchTerm.toLowerCase()) || 
      stock.name.toLowerCase().includes(tableSearchTerm.toLowerCase())
    );

    if (sortConfig.key !== null) {
      list.sort((a: any, b: any) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [activeWatchlist, sortConfig, tableSearchTerm]);

  const filteredSuggestions = ALL_STOCKS_POOL.filter(stock => {
    const activeStocks = activeWatchlist.stocks;
    const isAlreadySelected = selectedStocks.some(s => s.symbol === stock.symbol);
    const isAlreadyInActiveWatchlist = activeStocks.some(s => s.symbol === stock.symbol);
    
    if (isAddStocksModalOpen && isAlreadyInActiveWatchlist) return false;
    
    return !isAlreadySelected &&
      (stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
       stock.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }).slice(0, 5);

  useEffect(() => {
    setFocusedIndex(0);
    if (searchTerm) setIsListVisible(true);
  }, [searchTerm]);

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (isAddStocksModalOpen) {
      setTimeout(() => stockSearchRef.current?.focus(), 100);
    }
  }, [isAddStocksModalOpen]);

  useEffect(() => {
    if (isModalOpen || isAddStocksModalOpen || selectedTradeStock) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, isAddStocksModalOpen, selectedTradeStock]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsListVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRequestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleTradeClick = (stock: any) => {
    if (selectedTradeStock?.symbol === stock.symbol) {
      setSelectedTradeStock(null);
    } else {
      setSelectedTradeStock(stock);
    }
  };

  const handleDummySubmitOrder = async (order: any) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    console.log("Mock Order Submitted:", order);
  };

  const handleCreateWatchlist = () => {
    if (!newWatchlistName.trim() || selectedStocks.length === 0) return;
    
    const newList = {
      name: newWatchlistName,
      stocks: selectedStocks
    };
    
    setWatchlists(prev => [...prev, newList]);
    setActiveTab(watchlists.length);
    handleCloseModal();
  };

  const handleAddStocksToActive = () => {
    if (selectedStocks.length === 0) return;
    setWatchlists(prev => {
      const newWatchlists = [...prev];
      newWatchlists[activeTab] = {
        ...newWatchlists[activeTab],
        stocks: [...newWatchlists[activeTab].stocks, ...selectedStocks]
      };
      return newWatchlists;
    });
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsAddStocksModalOpen(false);
    setNewWatchlistName('');
    setSearchTerm('');
    setSelectedStocks([]);
    setFocusedIndex(0);
    setIsListVisible(false);
  };

  const handleDeleteStock = (symbol: string) => {
    setWatchlists(prev => {
      const newWatchlists = [...prev];
      newWatchlists[activeTab] = {
        ...newWatchlists[activeTab],
        stocks: newWatchlists[activeTab].stocks.filter(s => s.symbol !== symbol)
      };
      return newWatchlists;
    });
  };

  const toggleStock = (stock: any) => {
    if (!stock) return;
    setSelectedStocks(prev => [...prev, stock]);
    stockSearchRef.current?.focus();
  };

  const removeStock = (symbol: string) => {
    setSelectedStocks(prev => prev.filter(s => s.symbol !== symbol));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsListVisible(true);
      setFocusedIndex(prev => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsListVisible(true);
      setFocusedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
    } else if (e.key === 'Enter') {
      if (isListVisible) {
        e.preventDefault();
        toggleStock(filteredSuggestions[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsListVisible(false);
    }
  };

  const SortIndicator = ({ sortKey }: { sortKey: string }) => {
    if (sortConfig.key !== sortKey) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  // If terminal is open, render it as the main content
  if (selectedTerminalStock) {
    return (
      <div className="watchlist-page" id="watchlist-page">
        <TerminalPage
          stock={selectedTerminalStock}
          onClose={() => setSelectedTerminalStock(null)}
        />
      </div>
    );
  }

  return (
    <div className="watchlist-page animate-fade-in" id="watchlist-page">
      <header className="watchlist-header">
        <div className="header-left">
          <h1 className="watchlist-title">Your Watchlist</h1>
          <p className="watchlist-subtitle">Track your favorite assets and market opportunities.</p>
        </div>
      </header>

      <div className="watchlist-tabs-row">
        <div className="tabs-scroll-area">
          {watchlists.map((wl, idx) => (
            <button
              key={idx}
              className={`tab-item ${activeTab === idx ? 'active' : ''}`}
              onClick={() => setActiveTab(idx)}
            >
              {wl.name}
            </button>
          ))}
          <button className="tab-add" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
          </button>
        </div>
        <div className="tabs-actions">
          <div className="watchlist-search-container">
            <Search size={14} className="search-icon-tab" />
            <input
              type="text"
              placeholder="Search watchlist..."
              value={tableSearchTerm}
              onChange={e => setTableSearchTerm(e.target.value)}
              className="watchlist-search-input"
            />
          </div>
          <button className="btn-tab-action" onClick={() => setIsAddStocksModalOpen(true)}>
            <Plus size={16} />
            <span>Add stocks</span>
          </button>
        </div>
      </div>

      <div className="watchlist-split-container">
        <div className="table-wrapper">
          <div className="watchlist-container">
            <table className="watchlist-table">
          <thead>
            <tr>
              <th align="left" className="sortable" onClick={() => handleRequestSort('symbol')}>
                <div className="th-content">COMPANY <SortIndicator sortKey="symbol" /></div>
              </th>
              <th align="center">TREND</th>
              <th align="right" className="sortable" onClick={() => handleRequestSort('price')}>
                <div className="th-content flex-end">MARKET PRICE <SortIndicator sortKey="price" /></div>
              </th>
              <th align="right" className="sortable" onClick={() => handleRequestSort('change')}>
                <div className="th-content flex-end">DAY CHG <SortIndicator sortKey="change" /></div>
              </th>
              <th align="right" className="sortable" onClick={() => handleRequestSort('volumeRaw')}>
                <div className="th-content flex-end">VOLUME <SortIndicator sortKey="volumeRaw" /></div>
              </th>
              <th align="center">52W PERF</th>
            </tr>
          </thead>
          <tbody>
            {sortedStocks.map((item) => {
              const isPositive = item.change >= 0;
              const color = isPositive ? 'var(--color-buy)' : 'var(--color-sell)';
              return (
                <tr key={item.symbol} className="watchlist-row">
                  <td>
                    <div className="company-cell">
                      <div className="company-icon" style={{ backgroundColor: `rgba(${isPositive ? '34, 197, 94' : '239, 68, 68'}, 0.1)` }}>
                        <span style={{ color }}>{item.symbol[0]}</span>
                      </div>
                      <div className="company-info">
                        <span className="company-symbol">{item.symbol}</span>
                        <span className="company-name text-muted">{item.name}</span>
                      </div>
                    </div>
                  </td>
                  <td align="center"><Sparkline data={item.trend} color={color} /></td>
                  <td align="right" className="mono price-value">₹{item.price.toFixed(2)}</td>
                  <td align="right">
                    <div className="change-cell">
                      <span className={`change-value ${isPositive ? 'text-buy' : 'text-sell'}`}>{isPositive ? '+' : ''}{item.change.toFixed(2)}</span>
                      <span className={`change-percent ${isPositive ? 'text-buy' : 'text-sell'}`}>{isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%</span>
                    </div>
                  </td>
                  <td align="right" className="mono text-muted">{item.volume}</td>
                  <td align="center">
                    <div className="perf-actions-container">
                       <PerformanceBar low={item.low52w} high={item.high52w} current={item.price} />
                       <div className="row-actions">
                          <button className="btn-row terminal" title="Open Terminal" onClick={() => setSelectedTerminalStock(item)}><BarChart2 size={18} /></button>
                          <button className="btn-row buy-sell" onClick={() => handleTradeClick(item)}>Buy/Sell</button>
                          <button className="btn-row remove" onClick={() => handleDeleteStock(item.symbol)} title="Remove"><Trash2 size={18} /></button>
                       </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
          </div>
        </div>
      </div>

      {selectedTradeStock && (
        <div className="modal-overlay" onClick={() => setSelectedTradeStock(null)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <WatchlistOrderPanel
              stock={selectedTradeStock}
              onClose={() => setSelectedTradeStock(null)}
              onSubmitOrder={handleDummySubmitOrder}
            />
          </div>
        </div>
      )}

      {(isModalOpen || isAddStocksModalOpen) && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} ref={modalRef}>
            <div className="modal-header">
              <h3>{isModalOpen ? 'Create New Watchlist' : `Add Stocks to ${activeWatchlist.name}`}</h3>
              <button className="btn-close" onClick={handleCloseModal}><X size={20} /></button>
            </div>

            <div className="modal-body custom-scrollbar">
              {isModalOpen && (
                <div className="form-group">
                  <label>Watchlist Name</label>
                  <input
                    type="text"
                    ref={nameInputRef}
                    placeholder="e.g. My Favorites"
                    value={newWatchlistName}
                    onChange={e => setNewWatchlistName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        stockSearchRef.current?.focus();
                      }
                    }}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Add Stocks</label>
                <div className="search-action-row">
                  <div className="search-container" ref={searchContainerRef}>
                    <span className="search-icon"><Search size={16} /></span>
                    <input
                      type="text"
                      placeholder="Search and hit enter..."
                      value={searchTerm}
                      ref={stockSearchRef}
                      onChange={e => setSearchTerm(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setIsListVisible(true)}
                    />
                    {isListVisible && searchTerm && filteredSuggestions.length > 0 && (
                      <div className="search-suggestions">
                        {filteredSuggestions.map((stock, i) => (
                          <div
                            key={stock.symbol}
                            className={`suggestion-item ${focusedIndex === i ? 'focused' : ''}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => toggleStock(stock)}
                          >
                            <div className="suggestion-info">
                              <span className="suggestion-symbol">{stock.symbol}</span>
                              <span className="suggestion-name">{stock.name}</span>
                            </div>
                            <Plus size={16} className="text-secondary" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn-action primary btn-inline"
                    onClick={isModalOpen ? handleCreateWatchlist : handleAddStocksToActive}
                    disabled={(!isModalOpen && selectedStocks.length === 0) || (isModalOpen && (!newWatchlistName.trim() || selectedStocks.length === 0))}
                  >
                    {isModalOpen ? 'Create' : 'Add'}
                  </button>
                </div>
              </div>

              {selectedStocks.length > 0 && (
                <div className="selected-stocks">
                  <label>Selected Stocks</label>
                  <div className="chips-container">
                    {selectedStocks.map(stock => (
                      <div key={stock.symbol} className="stock-chip animate-fade-in">
                        <span className="chip-symbol">{stock.symbol}</span>
                        <button onClick={() => removeStock(stock.symbol)}><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
