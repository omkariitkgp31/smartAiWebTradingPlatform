'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sb_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark'; // Fallback for SSR
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('sb_theme', theme);
  }, [theme]);

  const toggleTheme = () => setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  const setTheme = (t) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
