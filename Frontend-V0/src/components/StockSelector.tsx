'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import './StockSelector.css';

export default function StockSelector() {
  const { selectedSymbol, setSelectedSymbol, assets } = useMarket();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll selected pill into view
  useEffect(() => {
    if (!scrollRef.current || !selectedSymbol) return;
    const pill = scrollRef.current.querySelector(`[data-symbol="${selectedSymbol}"]`) as HTMLElement;
    if (pill) {
      pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedSymbol]);

  const scrollBy = (dir: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
    }
  };

  const filteredAssets = query.trim()
    ? assets.filter(a =>
        a.symbol.toLowerCase().includes(query.toLowerCase()) ||
        a.name?.toLowerCase().includes(query.toLowerCase())
      )
    : assets;

  const handleSelect = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    // Persist to localStorage
    try { localStorage.setItem('nb_selected_symbol', symbol); } catch (_) {}
    setQuery('');
    setSearchOpen(false);
    setFocused(false);
  }, [setSelectedSymbol]);

  const getPriceChange = (asset: any) => {
    if (!asset.initial_price || !asset.current_price) return 0;
    return ((asset.current_price - asset.initial_price) / asset.initial_price) * 100;
  };

  const showDropdown = focused && filteredAssets.length > 0;

  return (
    <div className="stock-selector" id="stock-selector">
      {/* Search */}
      <div className="stock-search-wrap" ref={searchRef}>
        <div className={`stock-search-box ${focused ? 'focused' : ''}`}>
          <Search size={14} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Search stocks…"
            onChange={e => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => { setFocused(true); setSearchOpen(true); }}
            className="stock-search-input"
            id="stock-search-input"
            autoComplete="off"
          />
          {query && (
            <button className="search-clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && searchOpen && (
          <div className="stock-dropdown" id="stock-dropdown">
            {filteredAssets.map(asset => {
              const change = getPriceChange(asset);
              const isUp = change >= 0;
              return (
                <button
                  key={asset.symbol}
                  className={`stock-dropdown-item ${selectedSymbol === asset.symbol ? 'active' : ''}`}
                  onClick={() => handleSelect(asset.symbol)}
                  id={`dropdown-item-${asset.symbol.toLowerCase()}`}
                >
                  <div className="dropdown-item-left">
                    <span className="dropdown-symbol">{asset.symbol}</span>
                    <span className="dropdown-name">{asset.name}</span>
                  </div>
                  <div className="dropdown-item-right">
                    <span className="dropdown-price mono">
                      ₹{asset.current_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`dropdown-change mono ${isUp ? 'up' : 'down'}`}>
                      {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {isUp ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll Arrow Left */}
      <button className="scroll-arrow scroll-arrow-left" onClick={() => scrollBy(-1)} id="scroll-arrow-left" aria-label="Scroll left">
        <ChevronLeft size={14} />
      </button>

      {/* Horizontal Pill Bar */}
      <div className="stock-pill-bar" ref={scrollRef} id="stock-pill-bar">
        {assets.map(asset => {
          const change = getPriceChange(asset);
          const isUp = change >= 0;
          const isSelected = selectedSymbol === asset.symbol;
          return (
            <button
              key={asset.symbol}
              data-symbol={asset.symbol}
              className={`stock-pill ${isSelected ? 'active' : ''} ${isUp ? 'pill-up' : 'pill-down'}`}
              onClick={() => handleSelect(asset.symbol)}
              id={`pill-${asset.symbol.toLowerCase()}`}
            >
              <span className="pill-symbol">{asset.symbol}</span>
              <span className="pill-price mono">
                ₹{asset.current_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`pill-change mono ${isUp ? 'up' : 'down'}`}>
                {isUp ? '+' : ''}{change.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Scroll Arrow Right */}
      <button className="scroll-arrow scroll-arrow-right" onClick={() => scrollBy(1)} id="scroll-arrow-right" aria-label="Scroll right">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
