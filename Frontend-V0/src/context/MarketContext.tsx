'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import * as api from '../services/api';

const MarketContext = createContext(null);

const DEFAULT_SYMBOL = 'RELIANCE';

function getPersistedSymbol(): string | null {
  try { return localStorage.getItem('nb_selected_symbol'); } catch (_) { return null; }
}

export function MarketProvider({ children }) {
  const [selectedSymbol, setSelectedSymbolState] = useState<string | null>(getPersistedSymbol() || DEFAULT_SYMBOL);
  const [assets, setAssets] = useState([]);
  const [marketStats, setMarketStats] = useState({});
  const [symbolLoading, setSymbolLoading] = useState(false);
  const [isOrderActive, setIsOrderActiveState] = useState(false);

  const setIsOrderActive = useCallback((active: boolean | ((prev: boolean) => boolean)) => {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      // @ts-ignore - startViewTransition might not be fully typed everywhere yet
      document.startViewTransition(() => {
        flushSync(() => {
          setIsOrderActiveState(active);
        });
      });
    } else {
      setIsOrderActiveState(active);
    }
  }, []);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const data = await api.getAssets();
        setAssets(data || []);
        setSelectedSymbolState(prev => {
          // Validate persisted symbol; default to first asset
          if (prev && data?.some(a => a.symbol === prev)) return prev;
          const first = data?.[0]?.symbol || DEFAULT_SYMBOL;
          try { localStorage.setItem('nb_selected_symbol', first); } catch (_) {}
          return first;
        });
      } catch {
        // API not available yet
      }
    };
    loadAssets();
    const interval = setInterval(loadAssets, 3000);
    return () => clearInterval(interval);
  }, []);

  const setSelectedSymbol = useCallback((symbol: string) => {
    setSymbolLoading(true);
    setSelectedSymbolState(symbol);
    try { localStorage.setItem('nb_selected_symbol', symbol); } catch (_) {}
    // Brief loading state for smooth UX
    setTimeout(() => setSymbolLoading(false), 300);
  }, []);

  const handleMarketStats = useCallback((stats) => {
    setMarketStats(stats);
  }, []);

  return (
    <MarketContext.Provider value={{
      selectedSymbol,
      setSelectedSymbol,
      assets,
      marketStats,
      setMarketStats: handleMarketStats,
      symbolLoading,
      isOrderActive,
      setIsOrderActive,
    }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used within MarketProvider');
  return ctx;
}
