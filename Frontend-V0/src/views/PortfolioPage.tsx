'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMarket } from '../context/MarketContext';
import * as api from '../services/api';
import * as ws from '../services/websocket';
import CandlestickChart from '../components/CandlestickChart';
import { DollarSign, Wallet, TrendingUp, BarChart3, RefreshCw } from 'lucide-react';
import './PortfolioPage.css';

// ── Portfolio Analysis Chart ─────────────────────────────────────────
const ANALYSIS_RANGES = ['1M', '6M', '1Y', '3Y', '5Y', 'All'] as const;
type AnalysisRange = typeof ANALYSIS_RANGES[number];

// Generate realistic dual-series data (current & invested) for each range
function genAnalysisData(range: AnalysisRange) {
  const counts: Record<AnalysisRange, number> = { '1M': 22, '6M': 130, '1Y': 252, '3Y': 756, '5Y': 1260, 'All': 1800 };
  const n = counts[range];
  const investedBase = 716236;
  const currentBase  = 745806;
  const current:  number[] = [];
  const invested: number[] = [];
  let c = currentBase  * 0.62;
  let inv = investedBase * 0.85;
  for (let i = 0; i < n; i++) {
    c   += (Math.random() - 0.46) * (currentBase  / n) * 2.2;
    inv += (Math.random() - 0.47) * (investedBase / n) * 1.4;
    current.push(Math.max(c,   currentBase  * 0.4));
    invested.push(Math.max(inv, investedBase * 0.5));
  }
  // Force end values
  current[n - 1]  = currentBase;
  invested[n - 1] = investedBase;
  return { current, invested, n };
}

function PortfolioAnalysisChart() {
  const [range, setRange]         = useState<AnalysisRange>('1Y');
  const [hoverIdx, setHoverIdx]   = useState<number | null>(null);
  const [data, setData]           = useState(() => genAnalysisData('1Y'));
  const svgRef                    = useRef<SVGSVGElement>(null);

  useEffect(() => { setData(genAnalysisData(range)); setHoverIdx(null); }, [range]);

  const W = 900, H = 220, PAD = { t: 20, r: 20, b: 10, l: 16 };
  const { current, invested, n } = data;

  const allVals  = [...current, ...invested];
  const minV     = Math.min(...allVals) * 0.97;
  const maxV     = Math.max(...allVals) * 1.02;
  const rangeV   = maxV - minV || 1;

  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  const toX = (i: number) => PAD.l + (i / (n - 1)) * chartW;
  const toY = (v: number) => PAD.t + chartH - ((v - minV) / rangeV) * chartH;

  const polyline = (arr: number[]) =>
    arr.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

  const areaPath = (arr: number[]) => {
    const pts = arr.map((v, i) => `${toX(i)},${toY(v)}`).join(' L ');
    return `M ${toX(0)},${toY(arr[0])} L ${pts} L ${toX(n-1)},${PAD.t + chartH} L ${toX(0)},${PAD.t + chartH} Z`;
  };

  // Current hover values
  const idx       = hoverIdx ?? n - 1;
  const curVal    = current[idx]  ?? current[n - 1];
  const invVal    = invested[idx] ?? invested[n - 1];
  const pnlVal    = curVal - invVal;
  const pnlPct    = invVal > 0 ? (pnlVal / invVal) * 100 : 0;
  const isPos     = pnlVal >= 0;

  // Hover x line
  const hoverX    = hoverIdx !== null ? toX(hoverIdx) : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const svgX  = ((e.clientX - rect.left) / rect.width) * W;
    const relX  = svgX - PAD.l;
    const i     = Math.round((relX / chartW) * (n - 1));
    setHoverIdx(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div className="pf-card pf-analysis">
      {/* Header */}
      <div className="pf-analysis-header">
        <div>
          <h2 className="pf-analysis-title">Portfolio Analysis</h2>
          <p className="pf-analysis-sub">All data is computed as of previous trading day</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="pf-analysis-stats">
        <div className="pf-an-stat">
          <span className="pf-an-label"><span className="pf-an-dot pf-an-dot-cur" /> Current</span>
          <span className="pf-an-val mono">
            &#x20B9;{curVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`pf-an-change mono ${isPos ? 'pnl-pos' : 'pnl-neg'}`}>
            {isPos ? '+' : '-'}&#x20B9;{Math.abs(pnlVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            &nbsp;({isPos ? '+' : ''}{pnlPct.toFixed(2)}%)&nbsp;
            <span className="pf-an-range-tag">{range}</span>
          </span>
        </div>
        <div className="pf-an-stat pf-an-stat-right">
          <span className="pf-an-label"><span className="pf-an-dot pf-an-dot-inv" /> Invested</span>
          <span className="pf-an-val mono">
            &#x20B9;{invVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="pf-analysis-chart-wrap">
        <svg
          ref={svgRef}
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="curGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#94a3b8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fills */}
          <path d={areaPath(invested)} fill="url(#invGrad)" />
          <path d={areaPath(current)}  fill="url(#curGrad)" />

          {/* Lines */}
          <polyline
            points={polyline(invested)}
            fill="none" stroke="#94a3b8" strokeWidth="1.5"
            strokeLinejoin="round" strokeLinecap="round"
          />
          <polyline
            points={polyline(current)}
            fill="none" stroke="#6366f1" strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round"
          />

          {/* Hover crosshair */}
          {hoverX !== null && (
            <>
              <line
                x1={hoverX} y1={PAD.t} x2={hoverX} y2={PAD.t + chartH}
                stroke="#6366f1" strokeWidth="1" strokeDasharray="4 3" opacity="0.5"
              />
              <circle cx={hoverX} cy={toY(curVal)}  r={4} fill="#6366f1" stroke="#fff" strokeWidth="1.5" />
              <circle cx={hoverX} cy={toY(invVal)}  r={3} fill="#94a3b8" stroke="#fff" strokeWidth="1.5" />
            </>
          )}
        </svg>
      </div>

      {/* Time range tabs */}
      <div className="pf-analysis-ranges">
        {ANALYSIS_RANGES.map(r => (
          <button
            key={r}
            className={`pf-an-range-btn ${range === r ? 'active' : ''}`}
            onClick={() => setRange(r)}
          >{r}</button>
        ))}
      </div>
    </div>
  );
}

// ── Top Stats Cards ──────────────────────────────────────────────────
function TopStatsCards({
  totalValue,
  totalCash,
  unrealizedPnl,
  realizedPnl,
}: {
  totalValue: number;
  totalCash: number;
  unrealizedPnl: number;
  realizedPnl: number;
}) {
  return (
    <div className="pf-top-stats-row">
      {/* 1. Total Value */}
      <div className="pf-top-card pf-tc-blue">
        <div className="pf-tc-header">
          <span className="pf-tc-title">TOTAL VALUE</span>
          <span className="pf-tc-icon"><DollarSign size={16} /></span>
        </div>
        <div className="pf-tc-val mono">
          &#x20B9;{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="pf-tc-sub">Total Net Worth</div>
        <div className={`pf-tc-badge ${unrealizedPnl >= 0 ? 'pf-tcb-green' : 'pf-tcb-red'}`}>
          <span className="pf-tcb-icon">{}</span>
          &#x20B9;{Math.abs(unrealizedPnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* 2. Cash Balance */}
      <div className="pf-top-card pf-tc-blue">
        <div className="pf-tc-header">
          <span className="pf-tc-title">CASH BALANCE</span>
          <span className="pf-tc-icon"><Wallet size={16} /></span>
        </div>
        <div className="pf-tc-val mono">
          &#x20B9;{totalCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="pf-tc-sub">Buying Power</div>
        <div className="pf-tc-badge pf-tcb-green">
          <span className="pf-tcb-icon"></span> Live
        </div>
      </div>

      {/* 3. Realized P&L */}
      <div className="pf-top-card pf-tc-green">
        <div className="pf-tc-header">
          <span className="pf-tc-title">REALIZED P&amp;L</span>
          <span className="pf-tc-icon"><TrendingUp size={16} /></span>
        </div>
        <div className="pf-tc-val mono">
          <span style={{ color: realizedPnl >= 0 ? 'var(--color-buy)' : 'var(--color-sell)' }}>
            {realizedPnl >= 0 ? '+' : '-'}&#x20B9;{Math.abs(realizedPnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="pf-tc-sub">Historical Returns</div>
        <div className={`pf-tc-badge ${realizedPnl >= 0 ? 'pf-tcb-green' : 'pf-tcb-red'}`}>
          <span className="pf-tcb-icon"></span> All time
        </div>
      </div>

      {/* 4. Unrealized P&L */}
      <div className="pf-top-card pf-tc-red">
        <div className="pf-tc-header">
          <span className="pf-tc-title">UNREALIZED P&amp;L</span>
          <span className="pf-tc-icon"><BarChart3 size={16} /></span>
        </div>
        <div className="pf-tc-val mono">
          <span style={{ color: 'var(--text-primary)' }}>
            {unrealizedPnl >= 0 ? '+' : '-'}
            &#x20B9;{Math.abs(unrealizedPnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="pf-tc-sub">Running Returns</div>
        <div className="pf-tc-badge pf-tcb-red">
          <span className="pf-tcb-icon"></span> Current
        </div>
      </div>
    </div>
  );
}


// ── Tiny Sparkline ──────────────────────────────────────────────────
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const w = 80, h = 36;
  if (!data || data.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');
  const color = positive ? '#22c55e' : '#ef4444';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}



// ── Donut Chart ──────────────────────────────────────────────────────
function DonutChart({
  segments,
  hoveredIdx,
  onHover,
}: {
  segments: { label: string; value: number; color: string }[];
  hoveredIdx: number | null;
  onHover: (i: number | null) => void;
}) {
  const hovered    = hoveredIdx;
  const setHovered = onHover;
  const size    = 180;
  const cx = size / 2, cy = size / 2;
  const outer = 74, inner = 48;
  const hoverGrow = 8;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  let cumAngle = -90;
  const segData = segments.map((seg) => {
    const angle = (seg.value / total) * 360;
    const start = cumAngle;
    const end   = cumAngle + angle - 2;
    const mid   = cumAngle + angle / 2;
    cumAngle += angle;
    return { seg, angle, start, end, mid };
  });

  const toRad = (d: number) => (d * Math.PI) / 180;

  const paths = segData.map(({ seg, angle, start, end }, i) => {
    const isHov = hovered === i;
    const r1 = outer + (isHov ? hoverGrow : 0);
    const r2 = inner;
    const x1 = cx + r1 * Math.cos(toRad(start));
    const y1 = cy + r1 * Math.sin(toRad(start));
    const x2 = cx + r1 * Math.cos(toRad(end));
    const y2 = cy + r1 * Math.sin(toRad(end));
    const x3 = cx + r2 * Math.cos(toRad(end));
    const y3 = cy + r2 * Math.sin(toRad(end));
    const x4 = cx + r2 * Math.cos(toRad(start));
    const y4 = cy + r2 * Math.sin(toRad(start));
    const largeArc = angle - 2 > 180 ? 1 : 0;
    return (
      <path
        key={i}
        d={`M ${x1} ${y1} A ${r1} ${r1} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r2} ${r2} 0 ${largeArc} 0 ${x4} ${y4} Z`}
        fill={seg.color}
        opacity={hovered === null ? 0.88 : isHov ? 1 : 0.35}
        style={{
          cursor: 'pointer',
          transition: 'opacity 0.2s ease, filter 0.2s ease',
          filter: isHov ? `drop-shadow(0 0 6px ${seg.color}99)` : 'none',
        }}
        onMouseEnter={() => setHovered(i)}
        onMouseLeave={() => setHovered(null)}
      />
    );
  });

  const hovSeg = hovered !== null ? segData[hovered].seg : null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {paths}
      {hovSeg ? (
        <>
          <text x={cx} y={cy - 8} textAnchor="middle" fill={hovSeg.color} fontSize="14" fontWeight="700">
            {hovSeg.value}%
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">
            {hovSeg.label}
          </text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - 6} textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="600">Portfolio</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="10">Allocation</text>
        </>
      )}
    </svg>
  );
}

// ── Constants ─────────────────────────────────────────────────────────
// Indian stock colours & initials
const ASSET_COLORS: Record<string, string> = {
  RELIANCE: '#f59e0b',
  TCS:      '#3b82f6',
  INFY:     '#8b5cf6',
  HDFCBANK: '#22c55e',
  WIPRO:    '#ec4899',
};
const ASSET_ICONS: Record<string, string> = {
  RELIANCE: 'R',
  TCS:      'T',
  INFY:     'I',
  HDFCBANK: 'H',
  WIPRO:    'W',
};

const SYMBOL_SECTOR: Record<string, string> = {
  RELIANCE:   'Energy & FMCG',
  TCS:        'IT & Tech',
  INFY:       'IT & Tech',
  HDFCBANK:   'Banking',
  ICICIBANK:  'Banking',
  BHARTIARTL: 'Telecom',
  ADANIENT:   'Infrastructure',
  TATAMOTORS: 'Auto',
};

const SECTOR_COLORS: Record<string, string> = {
  'IT & Tech':       '#3b82f6',
  'Banking':         '#8b5cf6',
  'Energy & FMCG':   '#f59e0b',
  'Auto':            '#f97316',
  'Telecom':         '#22c55e',
  'Infrastructure':  '#ec4899',
};

// ── Dummy Indian stocks — always displayed ────────────────────────────



const TIME_RANGES = ['1D', '1W', '1M', '3M', '6M', 'YTD'];

// ── INR formatter ─────────────────────────────────────────────────────
function inr(val: number, decimals = 2) {
  return '₹' + val.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ═══════════════════════════════════════════════════════════════════════
export default function PortfolioPage() {
  const { assets } = useMarket();

  // Using portal data for chart; we map internal asset symbols to NSE stocks
  const NSE_CHART_STOCKS = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK'];
  const [portfolio, setPortfolio]           = useState<any>(null);
  const [holdings,  setHoldings]            = useState<any[]>([]);
  const [pnl,       setPnl]                 = useState<any>(null);
  const [candles,   setCandles]             = useState<any[]>([]);
  const [candleInterval, setCandleInterval] = useState('1m');
  const [selectedRange,  setSelectedRange]  = useState('1D');
  const [chartSymbol,    setChartSymbol]    = useState('RELIANCE');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange,  setPriceChange]  = useState({ abs: 12.5, pct: 0.44 });

  const [hoveredSector, setHoveredSector] = useState<number | null>(null);
  const [hoveredHolding, setHoveredHolding] = useState<string | null>(null);

  const candleIntervalRef = useRef(candleInterval);
  candleIntervalRef.current = candleInterval;

  // Scale factor: treat internal prices as INR by multiplying
  const INR_SCALE = 83.5; // approx USD→INR for demo

  const loadData = useCallback(async () => {
    try {
      const [p, h, pl] = await Promise.all([api.getPortfolio(), api.getHoldings(), api.getPnL()]);
      setPortfolio(p);
      setHoldings(h || []);
      setPnl(pl);
    } catch { /* silent */ }
  }, []);

  const RANGE_TO_CANDLES: Record<string, { interval: string; count: number }> = {
    '1D':  { interval: '5m', count: 288 },  // 24h of 5m
    '1W':  { interval: '1h', count: 168 },  // 7 days of 1h
    '1M':  { interval: '1h', count: 720 },  // 30 days of 1h
    '3M':  { interval: '1d', count: 90  },  // 90 daily
    '6M':  { interval: '1d', count: 180 },  // 180 daily
    'YTD': { interval: '1d', count: 365 },  // full year
  };

  const loadCandles = useCallback(async () => {
    try {
      const { interval: rangeInterval, count: rangeCount } = RANGE_TO_CANDLES[selectedRange] || { interval: candleInterval, count: 100 };
      const data = await api.getCandles(chartSymbol, rangeInterval, rangeCount);
      if (data?.length) {
        setCandles(data);
        const last = data[data.length - 1];
        const prev = data[data.length - 2];
        setCurrentPrice(last.close);
        if (prev) {
          const diff = last.close - prev.close;
          setPriceChange({ abs: Math.abs(diff), pct: Math.abs((diff / prev.close) * 100) });
        }
      }
    } catch { /* silent */ }
  }, [chartSymbol, candleInterval, selectedRange]);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 5000);
    window.addEventListener('order:placed', loadData);
    return () => {
      clearInterval(iv);
      window.removeEventListener('order:placed', loadData);
    };
  }, [loadData]);
  useEffect(() => { loadCandles(); const iv = setInterval(loadCandles, 30000); return () => clearInterval(iv); }, [loadCandles]);

  // WS live price
  useEffect(() => {
    ws.connect();
    ws.subscribe(chartSymbol);
    const unsub: () => void = ws.onMessage((msg: any) => {
      if (msg.type === 'TRADE_PRINT' && msg.symbol === chartSymbol) {
        const price = Number(msg.price);
        setCurrentPrice(price);
        if (['1m', '5m'].includes(candleIntervalRef.current)) {
          setCandles(prev => {
            if (!prev?.length) return prev;
            const updated = [...prev];
            const last = { ...updated[updated.length - 1] };
            last.close = price;
            if (price > last.high) last.high = price;
            if (price < last.low)  last.low  = price;
            updated[updated.length - 1] = last;
            return updated;
          });
        }
      }
    });
    return () => unsub();
  }, [chartSymbol]);

  // ── Live holdings derived from API state ─────────────────────────
  const liveHoldings = holdings.map((h: any) => {
    const asset = assets.find((a: any) => a.symbol === h.asset_symbol);
    const mkt_price  = asset?.current_price || h.avg_cost_basis;
    const market_value = mkt_price * h.quantity;
    const invested   = h.avg_cost_basis * h.quantity;
    const pnl        = market_value - invested;
    const pnl_pct    = invested > 0 ? (pnl / invested) * 100 : 0;
    const trend     = Array.from({ length: 14 }, (_: any, i: number) => {
      const t = i / 13;
      return parseFloat((h.avg_cost_basis + (mkt_price - h.avg_cost_basis) * t).toFixed(2));
    });
    return {
      asset_symbol: h.asset_symbol,
      name: asset?.name || h.asset_symbol,
      exchange: 'NSE',
      quantity: h.quantity,
      avg_cost_basis: h.avg_cost_basis,
      market_value,
      mkt_price,
      invested,
      pnl,
      pnl_pct,
      trend,
    };
  });

  // ── Sector allocation from actual holdings ───────────────────────
  const sectorTotals: Record<string, number> = {};
  liveHoldings.forEach((h: any) => {
    const sector = SYMBOL_SECTOR[h.asset_symbol] || 'Other';
    sectorTotals[sector] = (sectorTotals[sector] || 0) + h.market_value;
  });
  const totalHoldingsVal = Object.values(sectorTotals).reduce((s, v) => s + v, 0) || 1;
  const liveSectors = Object.entries(sectorTotals).map(([label, val]) => ({
    label,
    value: parseFloat(((val / totalHoldingsVal) * 100).toFixed(1)),
    color: SECTOR_COLORS[label] || '#64748b',
  }));

  // ── Derived values ────────────────────────────────────────────────
  const totalCash     = (portfolio?.cash_balance || 100000);
  const totalHoldings = liveHoldings.reduce((s: number, h: any) => s + h.market_value, 0);
  const totalValue    = totalCash + totalHoldings;
  const weeklyRevenue = 56182.30;

  const isChartPositive = priceChange.abs >= 0;
  const chartStockName = liveHoldings.find((h: any) => h.asset_symbol === chartSymbol)?.name || chartSymbol;

  return (
    <div className="pf-page animate-fade-in" id="portfolio-page">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="pf-page-header">
        <div>
          <h1 className="pf-title">Portfolio</h1>
          <span className="pf-subtitle">NSE · BSE · Indian Equities</span>
        </div>
        <div className="pf-market-badge">
          <span className="pf-market-dot" />
          Market Open
        </div>
      </div>

      {/* ── Top Stats Row ─────────────────────────────────── */}
      <TopStatsCards
        totalValue={totalValue}
        totalCash={totalCash}
        realizedPnl={pnl?.realized_pnl ?? 0}
        unrealizedPnl={pnl?.unrealized_pnl ?? 0}
      />

      <div className="pf-main-grid">

        {/* ── LEFT COLUMN ─────────────────────────────────── */}
        <div className="pf-left-col">

          {/* Holdings / Assets Overview */}
          <div className="pf-card pf-assets-overview">
            <div className="pf-card-header">
              <span className="pf-card-title">Holdings</span>
              <span className="pf-holdings-count">{liveHoldings.length} Stocks</span>
            </div>
            <div className="pf-table-wrap">
              <table className="pf-table">
                <thead>
                  <tr>
                    <th>STOCK</th>
                    <th>LTP</th>
                    <th>AVG COST</th>
                    <th>INVESTED</th>
                    <th>7D TREND</th>
                    <th>CURRENT VALUE</th>
                    <th>P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {liveHoldings.map(h => {
                    const isPos = h.pnl >= 0;
                    const color = ASSET_COLORS[h.asset_symbol] || '#3b82f6';
                    const isHovered = hoveredHolding === h.asset_symbol;
                    const isDimmed  = hoveredHolding !== null && !isHovered;
                    return (
                      <tr
                        key={h.asset_symbol}
                        className={`pf-table-row ${isHovered ? 'pf-row-active' : ''}`}
                        style={{
                          '--row-color': color,
                          opacity: isDimmed ? 0.25 : 1,
                          transition: 'opacity 0.2s ease',
                          cursor: 'pointer',
                        } as React.CSSProperties}
                        onMouseEnter={() => setHoveredHolding(h.asset_symbol)}
                        onMouseLeave={() => setHoveredHolding(null)}
                      >
                        <td>
                          <div className="pf-asset-cell">
                            <div
                              className="pf-asset-icon"
                              style={{
                                background: color,
                                transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                boxShadow: isHovered ? `0 0 16px ${color}cc, 0 0 6px ${color}88` : '0 2px 8px rgba(0,0,0,0.4)',
                              }}
                            >
                              {ASSET_ICONS[h.asset_symbol] || h.asset_symbol[0]}
                            </div>
                            <div className="pf-asset-info">
                              <span
                                className="pf-asset-name"
                                style={{
                                  color: isHovered ? color : undefined,
                                  fontWeight: isHovered ? 700 : undefined,
                                  textShadow: isHovered ? `0 0 12px ${color}66` : undefined,
                                  transition: 'color 0.2s ease, text-shadow 0.2s ease',
                                }}
                              >{h.asset_symbol}</span>
                              <span className="pf-asset-symbol">{h.exchange} · {h.quantity} shares</span>
                            </div>
                          </div>
                        </td>
                        <td className="mono pf-td-num">
                          {inr(h.mkt_price)}
                        </td>
                        <td className="mono pf-td-num">
                          {inr(h.avg_cost_basis)}
                        </td>
                        <td className="mono pf-td-num">
                          {inr(h.invested, 0)}
                        </td>
                        <td className="pf-td-spark">
                          <Sparkline data={h.trend} positive={isPos} />
                        </td>
                        <td className="mono pf-td-num">
                          {inr(h.market_value)}
                        </td>
                        <td>
                          <div className={`pf-pnl-cell ${isPos ? 'pnl-pos' : 'pnl-neg'}`}>
                            <span className="mono">
                              {isPos ? '+' : '-'}{inr(Math.abs(h.pnl))}
                            </span>
                            <span className="pf-pnl-pct mono">
                              {isPos ? '+' : ''}{h.pnl_pct.toFixed(2)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Chart — no gap below holdings */}
          <div className="pf-card pf-chart-section">
            <div className="pf-chart-header">
              <div className="pf-chart-left">
                <div className="pf-symbol-sel">
                  {NSE_CHART_STOCKS.map(sym => (
                    <button
                      key={sym}
                      className={`pf-sym-btn ${chartSymbol === sym ? 'active' : ''}`}
                      onClick={() => setChartSymbol(sym)}
                      id={`pf-sym-${sym.toLowerCase()}`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
                <span className="pf-live-badge">NSE Live</span>
              </div>
              <div className="pf-time-ranges">
                {TIME_RANGES.map(r => (
                  <button
                    key={r}
                    className={`pf-range-btn ${selectedRange === r ? 'active' : ''}`}
                    onClick={() => setSelectedRange(r)}
                    id={`pf-range-${r.toLowerCase()}`}
                  >{r}</button>
                ))}
              </div>
            </div>

            <div className="pf-price-row">
              <div>
                <div className="pf-stock-full-name">{chartStockName}</div>
                <span className="pf-chart-price mono">
                  {currentPrice > 0 ? inr(currentPrice) : inr(liveHoldings.find(h => h.asset_symbol === chartSymbol)?.mkt_price || 0)}
                  <span className="pf-price-unit"> NSE</span>
                </span>
              </div>
              <span className={`pf-price-chg ${isChartPositive ? 'pos' : 'neg'}`}>
                {inr(priceChange.abs)} ({priceChange.pct.toFixed(2)}%)
              </span>
            </div>

            <div className="pf-chart-body">
              <CandlestickChart
                candles={candles}
                interval={candleInterval}
                onIntervalChange={setCandleInterval}
                symbol={chartSymbol}
              />
            </div>
          </div>

        </div>{/* end pf-left-col */}

        {/* ── RIGHT COLUMN ───────────────────────────────── */}
        <div className="pf-right-col">



          {/* Sector Allocation */}
          <div className="pf-card pf-sector">
            <span className="pf-card-title">Sector Allocation</span>
            <div className="pf-donut-wrap">
              <DonutChart segments={liveSectors} hoveredIdx={hoveredSector} onHover={setHoveredSector} />
            </div>
            <div className="pf-sector-legend">
              {liveSectors.map((s, i) => (
                <div
                  key={s.label}
                  className="pf-legend-row"
                  style={{
                    opacity: hoveredSector === null ? 1 : hoveredSector === i ? 1 : 0.35,
                    transition: 'opacity 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoveredSector(i)}
                  onMouseLeave={() => setHoveredSector(null)}
                >
                  <span
                    className="pf-legend-dot"
                    style={{
                      background: s.color,
                      transform: hoveredSector === i ? 'scale(1.4)' : 'scale(1)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                  <span
                    className="pf-legend-label"
                    style={{ color: hoveredSector === i ? s.color : undefined, fontWeight: hoveredSector === i ? 600 : undefined }}
                  >{s.label}</span>
                  <span className="pf-legend-pct mono" style={{ color: hoveredSector === i ? s.color : undefined }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>

        </div>{/* end pf-right-col */}

      </div>{/* end pf-main-grid */}

      {/* ── Portfolio Analysis ────────────────────────── */}
      <PortfolioAnalysisChart />

    </div>
  );
}
