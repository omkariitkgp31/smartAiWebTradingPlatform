// @ts-nocheck
/**
 * Custom Canvas 2D Candlestick Chart Engine
 * Renders candles, volume histogram, moving averages, crosshair, and tooltips.
 */
export default class ChartEngine {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      paddingRight: 70,
      paddingBottom: 28,
      paddingTop: 16,
      paddingLeft: 0,
      volumeHeightRatio: 0.18,
      minCandleWidth: 3,
      maxCandleWidth: 30,
      ...options,
    };

    // Data
    this.candles = [];
    this.smaData = [];
    this.emaData = [];
    this.showSMA = true;
    this.showEMA = true;

    // View state
    this.visibleStart = 0;
    this.visibleCount = 80;
    this.minVisibleCount = 10;
    this.maxVisibleCount = 500;

    // Interaction
    this.mouseX = -1;
    this.mouseY = -1;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartVisibleStart = 0;
    this.hoveredCandle = null;

    // Callbacks
    this.onTooltip = options.onTooltip || null;

    // Drawing Tools
    this.activeTool = 'cursor';
    this.drawings = [];
    this.redoList = [];
    this.currentDrawing = null;

    // Create canvases
    this.mainCanvas = document.createElement('canvas');
    this.overlayCanvas = document.createElement('canvas');
    this.mainCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%';
    this.overlayCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;cursor:crosshair';
    container.appendChild(this.mainCanvas);
    container.appendChild(this.overlayCanvas);

    this.mainCtx = this.mainCanvas.getContext('2d');
    this.overlayCtx = this.overlayCanvas.getContext('2d');

    // Read theme colors
    this._readTheme();

    // Bind events
    this._bindEvents();

    // Initial size
    this.resize();
  }

  _readTheme() {
    const s = getComputedStyle(this.container);
    const get = (v) => s.getPropertyValue(v).trim();
    this.colors = {
      bg: 'transparent',
      grid: get('--chart-grid') || 'rgba(255,255,255,0.04)',
      crosshair: get('--chart-crosshair') || '#3b82f6',
      candleUp: get('--chart-candle-up') || '#22c55e',
      candleDown: get('--chart-candle-down') || '#ef4444',
      volumeUp: get('--chart-volume-up') || 'rgba(34,197,94,0.2)',
      volumeDown: get('--chart-volume-down') || 'rgba(239,68,68,0.2)',
      sma: get('--chart-sma-short') || '#f59e0b',
      ema: get('--chart-ema-long') || '#8b5cf6',
      textPrimary: get('--text-primary') || '#e2e8f0',
      textSecondary: get('--text-secondary') || '#94a3b8',
      textMuted: get('--text-muted') || '#64748b',
      borderPrimary: get('--border-primary') || 'rgba(255,255,255,0.06)',
    };
  }

  _bindEvents() {
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseLeave = this._handleMouseLeave.bind(this);
    this._onWheel = this._handleWheel.bind(this);
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);

    this.overlayCanvas.addEventListener('mousemove', this._onMouseMove);
    this.overlayCanvas.addEventListener('mouseleave', this._onMouseLeave);
    this.overlayCanvas.addEventListener('wheel', this._onWheel, { passive: false });
    this.overlayCanvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  _handleMouseMove(e) {
    const rect = this.overlayCanvas.getBoundingClientRect();
    this.mouseX = (e.clientX - rect.left) * this.dpr;
    this.mouseY = (e.clientY - rect.top) * this.dpr;

    if (this.isDragging) {
      const dx = (e.clientX - this.dragStartX);
      const candleWidth = this._getCandleWidth();
      const shift = Math.round(dx / (candleWidth / this.dpr));
      this.visibleStart = Math.max(0,
        Math.min(this.candles.length - this.visibleCount,
          this.dragStartVisibleStart - shift));
      this.renderMain();
    }

    if (this.currentDrawing) {
      const area = this._getChartArea();
      const visible = this._getVisibleCandles();
      if (visible.length) {
        const candleW = this._getCandleWidth();
        const relX = this.mouseX - area.x;
        const idx = Math.floor(relX / candleW);
        const candleIdx = Math.max(0, Math.min(this.candles.length - 1, this.visibleStart + idx));
        const c = this.candles[candleIdx];
        const priceRange = this._getPriceRange(visible);
        const price = priceRange.max - ((this.mouseY - area.y) / area.priceHeight) * (priceRange.max - priceRange.min);
        const time = c ? Math.floor(c.open_time / 1_000_000_000) : 0;
        
        this.currentDrawing.x2 = time;
        this.currentDrawing.y2 = price;
        this.renderMain();
      }
    }

    this._updateHover();
    this.renderOverlay();
  }

  _handleMouseLeave() {
    this.mouseX = -1;
    this.mouseY = -1;
    this.hoveredCandle = null;
    if (this.onTooltip) this.onTooltip(null);
    this.renderOverlay();
  }

  _handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    const zoomFactor = 1 + delta * 0.15;
    const newCount = Math.round(this.visibleCount * zoomFactor);
    const clamped = Math.max(this.minVisibleCount, Math.min(this.maxVisibleCount, newCount));

    // Zoom centered on mouse position
    const chartArea = this._getChartArea();
    const mouseRatio = (this.mouseX - chartArea.x) / chartArea.width;
    const diff = clamped - this.visibleCount;
    const newStart = Math.round(this.visibleStart - diff * mouseRatio);

    this.visibleCount = clamped;
    this.visibleStart = Math.max(0, Math.min(this.candles.length - this.visibleCount, newStart));
    this.renderMain();
    this._updateHover();
    this.renderOverlay();
  }

  _handleMouseDown(e) {
    const defaultTools = ['cursor', 'crosshair', 'measure', 'magnet'];
    if (!defaultTools.includes(this.activeTool) && this.activeTool !== 'eraser') {
      const area = this._getChartArea();
      if (this.mouseY >= area.y && this.mouseY <= area.y + area.priceHeight) {
        const visible = this._getVisibleCandles();
        if (!visible.length) return;
        
        const candleW = this._getCandleWidth();
        const relX = this.mouseX - area.x;
        const idx = Math.floor(relX / candleW);
        const candleIdx = Math.max(0, Math.min(this.candles.length - 1, this.visibleStart + idx));
        const c = this.candles[candleIdx];
        
        const priceRange = this._getPriceRange(visible);
        const price = priceRange.max - ((this.mouseY - area.y) / area.priceHeight) * (priceRange.max - priceRange.min);
        const time = Math.floor(c.open_time / 1_000_000_000);

        if (this.activeTool === 'horizontal') {
          this.drawings.push({ type: 'horizontal', y: price, color: this.colors.crosshair });
          this.redoList = [];
        } else if (this.activeTool === 'text') {
           const label = window.prompt("Enter text here:");
           if (label) {
             this.drawings.push({ type: 'text', text: label, x1: time, y1: price, color: this.colors.crosshair });
             this.redoList = [];
           }
        } else if (this.activeTool === 'pen') {
           this.drawings.push({ type: 'pen', x1: time, y1: price, color: this.colors.crosshair });
           this.redoList = [];
        } else {
          if (!this.currentDrawing) {
            this.currentDrawing = {
              type: this.activeTool,
              x1: time,
              y1: price,
              x2: time,
              y2: price,
              color: this.colors.crosshair,
            };
            this.isDrawingActive = true;
            this.drawStartX = this.mouseX;
            this.drawStartY = this.mouseY;
          } else {
            // Second click finishes two-click draw
            this.currentDrawing.x2 = time;
            this.currentDrawing.y2 = price;
            this.drawings.push(this.currentDrawing);
            this.redoList = []; // Clear redo list on new drawing
            this.currentDrawing = null;
            this.isDrawingActive = false;
          }
        }
        this.renderMain();
      }
      return;
    }
    
    if (this.activeTool === 'eraser') {
      if (this.drawings.length > 0) {
        this.redoList.push(this.drawings.pop());
        this.renderMain();
      }
      return;
    }

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartVisibleStart = this.visibleStart;
    this.overlayCanvas.style.cursor = 'grabbing';
  }

  _handleMouseUp() {
    this.isDragging = false;
    this.overlayCanvas.style.cursor = 'crosshair';

    // If drag drew a shape larger than a few pixels, complete it
    if (this.isDrawingActive && this.currentDrawing) {
      const dx = this.mouseX - this.drawStartX;
      const dy = this.mouseY - this.drawStartY;
      if (Math.sqrt(dx*dx + dy*dy) > 10 * this.dpr) {
        this.drawings.push(this.currentDrawing);
        this.redoList = [];
        this.currentDrawing = null;
        this.isDrawingActive = false;
        this.renderMain();
      }
    }
  }

  _updateHover() {
    if (this.mouseX < 0 || !this.candles.length) {
      this.hoveredCandle = null;
      if (this.onTooltip) this.onTooltip(null);
      return;
    }

    const chartArea = this._getChartArea();
    const candleWidth = this._getCandleWidth();
    const relX = this.mouseX - chartArea.x;
    const idx = Math.floor(relX / candleWidth);
    const candleIdx = this.visibleStart + idx;

    if (candleIdx >= 0 && candleIdx < this.candles.length) {
      const c = this.candles[candleIdx];
      this.hoveredCandle = { ...c, index: candleIdx };
      if (this.onTooltip) {
        const rect = this.overlayCanvas.getBoundingClientRect();
        this.onTooltip({
          candle: c,
          x: (chartArea.x + idx * candleWidth + candleWidth / 2) / this.dpr,
          y: this.mouseY / this.dpr,
          containerRect: rect,
        });
      }
    } else {
      this.hoveredCandle = null;
      if (this.onTooltip) this.onTooltip(null);
    }
  }

  _getChartArea() {
    const { paddingLeft, paddingRight, paddingTop, paddingBottom, volumeHeightRatio } = this.options;
    const w = this.width - paddingLeft - paddingRight;
    const h = this.height - paddingTop - paddingBottom;
    const priceH = h * (1 - volumeHeightRatio);
    const volH = h * volumeHeightRatio;
    return {
      x: paddingLeft,
      y: paddingTop,
      width: w,
      height: h,
      priceHeight: priceH,
      volumeHeight: volH,
      volumeTop: paddingTop + priceH,
    };
  }

  _getCandleWidth() {
    const area = this._getChartArea();
    return Math.max(this.options.minCandleWidth, area.width / this.visibleCount);
  }

  _getVisibleCandles() {
    const end = Math.min(this.visibleStart + this.visibleCount, this.candles.length);
    return this.candles.slice(this.visibleStart, end);
  }

  _getPriceRange(visible) {
    if (!visible.length) return { min: 0, max: 1 };
    let min = Infinity, max = -Infinity;
    for (const c of visible) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }
    // Include MA values in range
    const startTime = Math.floor(visible[0].open_time / 1_000_000_000);
    const endTime = Math.floor(visible[visible.length - 1].open_time / 1_000_000_000);
    if (this.showSMA) {
      for (const pt of this.smaData) {
        if (pt.time >= startTime && pt.time <= endTime) {
          if (pt.value < min) min = pt.value;
          if (pt.value > max) max = pt.value;
        }
      }
    }
    if (this.showEMA) {
      for (const pt of this.emaData) {
        if (pt.time >= startTime && pt.time <= endTime) {
          if (pt.value < min) min = pt.value;
          if (pt.value > max) max = pt.value;
        }
      }
    }
    const pad = (max - min) * 0.05 || 1;
    return { min: min - pad, max: max + pad };
  }

  _getVolumeMax(visible) {
    let max = 0;
    for (const c of visible) {
      if (c.volume > max) max = c.volume;
    }
    return max || 1;
  }

  // ─── Data ────────────────────────────────────────────────────────

  setData(candles) {
    this.candles = candles || [];
    // Auto-scroll to end
    this.visibleStart = Math.max(0, this.candles.length - this.visibleCount);
    this.renderMain();
    this.renderOverlay();
  }

  setIndicators(sma, ema) {
    this.smaData = sma || [];
    this.emaData = ema || [];
    this.renderMain();
  }

  updateLastCandle(candle) {
    if (!this.candles.length) return;
    this.candles[this.candles.length - 1] = candle;
    this.renderMain();
  }

  // ─── Rendering ───────────────────────────────────────────────────

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.width = rect.width * this.dpr;
    this.height = rect.height * this.dpr;

    for (const canvas of [this.mainCanvas, this.overlayCanvas]) {
      canvas.width = this.width;
      canvas.height = this.height;
    }

    this.renderMain();
    this.renderOverlay();
  }

  refreshTheme() {
    this._readTheme();
    this.renderMain();
    this.renderOverlay();
  }

  renderMain() {
    const ctx = this.mainCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    const visible = this._getVisibleCandles();
    if (!visible.length) return;

    const area = this._getChartArea();
    const priceRange = this._getPriceRange(visible);
    const volMax = this._getVolumeMax(visible);
    const candleW = this._getCandleWidth();
    const bodyW = Math.max(1, candleW * 0.7);

    // Grid
    this._drawGrid(ctx, area, priceRange);

    // Volume histogram
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = area.x + i * candleW + candleW / 2;
      const isUp = c.close >= c.open;
      const volH = (c.volume / volMax) * area.volumeHeight;

      ctx.fillStyle = isUp ? this.colors.volumeUp : this.colors.volumeDown;
      ctx.fillRect(x - bodyW / 2, area.volumeTop + area.volumeHeight - volH, bodyW, volH);
    }

    // Candles
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = area.x + i * candleW + candleW / 2;
      const isUp = c.close >= c.open;
      const color = isUp ? this.colors.candleUp : this.colors.candleDown;

      // Wick
      const highY = area.y + (1 - (c.high - priceRange.min) / (priceRange.max - priceRange.min)) * area.priceHeight;
      const lowY = area.y + (1 - (c.low - priceRange.min) / (priceRange.max - priceRange.min)) * area.priceHeight;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, this.dpr);
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const openY = area.y + (1 - (c.open - priceRange.min) / (priceRange.max - priceRange.min)) * area.priceHeight;
      const closeY = area.y + (1 - (c.close - priceRange.min) / (priceRange.max - priceRange.min)) * area.priceHeight;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));
      ctx.fillStyle = color;
      ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyHeight);
    }

    // Moving Averages
    this._drawMA(ctx, area, priceRange, visible, candleW);

    // Price Scale
    this._drawPriceScale(ctx, area, priceRange);

    // Time Scale
    this._drawTimeScale(ctx, area, visible, candleW);

    // Draw user tools
    this._drawUserShapes(ctx, area, priceRange);
  }

  _drawUserShapes(ctx, area, priceRange) {
    const visible = this._getVisibleCandles();
    if (!visible.length) return;

    const timeToX = (time) => {
      const firstT = Math.floor(visible[0].open_time / 1_000_000_000);
      const lastT = Math.floor(visible[visible.length - 1].open_time / 1_000_000_000);
      
      if (time >= firstT && time <= lastT) {
        for (let i = 0; i < visible.length; i++) {
          const ct = Math.floor(visible[i].open_time / 1_000_000_000);
          if (ct >= time) return area.x + i * this._getCandleWidth() + this._getCandleWidth() / 2;
        }
      }
      // Approximation for non-visible
      const idxOffset = (time - firstT) / ((lastT - firstT) / visible.length || 1);
      return area.x + idxOffset * this._getCandleWidth() + this._getCandleWidth() / 2;
    };

    const priceToY = (price) => {
      return area.y + (1 - (price - priceRange.min) / (priceRange.max - priceRange.min)) * area.priceHeight;
    };

    const shapes = [...this.drawings];
    if (this.currentDrawing) shapes.push(this.currentDrawing);

    for (const d of shapes) {
      if (d.type === 'horizontal') {
        const y = priceToY(d.y);
        ctx.strokeStyle = d.color || this.colors.crosshair;
        ctx.lineWidth = 1.5 * this.dpr;
        ctx.beginPath();
        ctx.moveTo(area.x, y);
        ctx.lineTo(area.x + area.width, y);
        ctx.stroke();
      } else if (d.type === 'trendline' || d.type === 'ray') {
        const x1 = timeToX(d.x1);
        const y1 = priceToY(d.y1);
        const x2 = timeToX(d.x2);
        const y2 = priceToY(d.y2);

        if (x1 !== null && x2 !== null) {
          let px1 = x1; let py1 = y1;
          let px2 = x2; let py2 = y2;

          if (d.type === 'ray') {
            const dx = px2 - px1;
            const dy = py2 - py1;
            if (dx !== 0) {
               const rayX = dx > 0 ? area.x + area.width : area.x;
               const rayY = py1 + dy * (rayX - px1)/dx;
               px2 = rayX;
               py2 = rayY;
            }
          }

          ctx.strokeStyle = d.color || this.colors.crosshair;
          ctx.lineWidth = 1.5 * this.dpr;
          ctx.beginPath();
          ctx.moveTo(px1, py1);
          ctx.lineTo(px2, py2);
          ctx.stroke();
        }
      } else if (d.type === 'rectangle') {
        const x1 = timeToX(Math.min(d.x1, d.x2));
        const x2 = timeToX(Math.max(d.x1, d.x2));
        const y1 = priceToY(Math.max(d.y1, d.y2));
        const y2 = priceToY(Math.min(d.y1, d.y2));
        if (x1 !== null && x2 !== null) {
          ctx.strokeStyle = d.color || this.colors.crosshair;
          ctx.lineWidth = 1.5 * this.dpr;
          ctx.fillStyle = (d.color || this.colors.crosshair) + '33';
          ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        }
      } else if (d.type === 'circle') {
        const x1 = timeToX(d.x1);
        const y1 = priceToY(d.y1);
        const x2 = timeToX(d.x2);
        const y2 = priceToY(d.y2);
        if (x1 !== null && x2 !== null) {
            const r = Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
            ctx.strokeStyle = d.color || this.colors.crosshair;
            ctx.lineWidth = 1.5 * this.dpr;
            ctx.fillStyle = (d.color || this.colors.crosshair) + '33';
            ctx.beginPath();
            ctx.arc(x1, y1, r, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
      } else if (d.type === 'fibonacci') {
        const x1 = timeToX(Math.min(d.x1, d.x2));
        const x2 = timeToX(Math.max(d.x1, d.x2));
        let py1 = priceToY(d.y1);
        let py2 = priceToY(d.y2);
        if (x1 !== null && x2 !== null) {
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const dy = py2 - py1;
          for (const lvl of levels) {
             const ly = py1 + dy * lvl;
             ctx.beginPath();
             ctx.moveTo(x1, ly);
             ctx.lineTo(x2, ly);
             ctx.strokeStyle = d.color || this.colors.crosshair;
             ctx.globalAlpha = 0.6;
             ctx.stroke();
             ctx.fillStyle = d.color || this.colors.crosshair;
             ctx.globalAlpha = 1;
             ctx.font = `${10 * this.dpr}px ${this._getFont()}`;
             ctx.fillText(lvl.toString(), x2 + 5, ly);
          }
        }
      } else if (d.type === 'text' || d.type === 'pen') {
        const x = timeToX(d.x1);
        const y = priceToY(d.y1);
        if (x !== null) {
           ctx.fillStyle = '#fff';
           ctx.font = `${14 * this.dpr}px ${this._getFont()}`;
           ctx.textAlign = 'left';
           ctx.textBaseline = 'middle';
           ctx.fillText(d.type === 'text' ? (d.text || 'Text') : '*', x, y);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  _drawGrid(ctx, area, priceRange) {
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = this.dpr;

    // Horizontal grid lines (price)
    const priceStep = this._niceStep(priceRange.max - priceRange.min, 5);
    const startPrice = Math.ceil(priceRange.min / priceStep) * priceStep;
    for (let p = startPrice; p <= priceRange.max; p += priceStep) {
      const y = area.y + (1 - (p - priceRange.min) / (priceRange.max - priceRange.min)) * area.priceHeight;
      ctx.beginPath();
      ctx.moveTo(area.x, y);
      ctx.lineTo(area.x + area.width, y);
      ctx.stroke();
    }

    // Volume separator line
    ctx.beginPath();
    ctx.moveTo(area.x, area.volumeTop);
    ctx.lineTo(area.x + area.width, area.volumeTop);
    ctx.stroke();
  }

  _drawMA(ctx, area, priceRange, visible, candleW) {
    const startTime = Math.floor(visible[0].open_time / 1_000_000_000);
    const timeToX = (time) => {
      for (let i = 0; i < visible.length; i++) {
        const ct = Math.floor(visible[i].open_time / 1_000_000_000);
        if (ct === time) return area.x + i * candleW + candleW / 2;
      }
      return null;
    };
    const priceToY = (price) => {
      return area.y + (1 - (price - priceRange.min) / (priceRange.max - priceRange.min)) * area.priceHeight;
    };

    const drawLine = (data, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 * this.dpr;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      let started = false;
      for (const pt of data) {
        if (pt.time < startTime) continue;
        const x = timeToX(pt.time);
        if (x === null) continue;
        const y = priceToY(pt.value);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    if (this.showSMA && this.smaData.length) drawLine(this.smaData, this.colors.sma);
    if (this.showEMA && this.emaData.length) drawLine(this.emaData, this.colors.ema);
  }

  _drawPriceScale(ctx, area, priceRange) {
    const step = this._niceStep(priceRange.max - priceRange.min, 5);
    const start = Math.ceil(priceRange.min / step) * step;
    ctx.fillStyle = this.colors.textMuted;
    ctx.font = `${11 * this.dpr}px ${this._getFont()}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let p = start; p <= priceRange.max; p += step) {
      const y = area.y + (1 - (p - priceRange.min) / (priceRange.max - priceRange.min)) * area.priceHeight;
      const label = p >= 1 ? p.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : p.toFixed(4);
      ctx.fillText(label, area.x + area.width + 8 * this.dpr, y);
    }
  }

  _drawTimeScale(ctx, area, visible, candleW) {
    if (!visible.length) return;
    ctx.fillStyle = this.colors.textMuted;
    ctx.font = `${10 * this.dpr}px ${this._getFont()}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelEvery = Math.max(1, Math.floor(visible.length / 8));
    for (let i = 0; i < visible.length; i += labelEvery) {
      const c = visible[i];
      const x = area.x + i * candleW + candleW / 2;
      const date = new Date(Math.floor(c.open_time / 1_000_000));
      const label = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      ctx.fillText(label, x, area.y + area.height + 6 * this.dpr);
    }
  }

  renderOverlay() {
    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.mouseX < 0 || this.isDragging) return;

    const area = this._getChartArea();
    const visible = this._getVisibleCandles();
    if (!visible.length) return;

    const priceRange = this._getPriceRange(visible);

    // Crosshair
    if (this.activeTool !== 'cursor') {
      ctx.setLineDash([3 * this.dpr, 3 * this.dpr]);
      ctx.strokeStyle = this.colors.crosshair;
      ctx.lineWidth = 1 * this.dpr;
      ctx.globalAlpha = 0.85;

      // Vertical
      ctx.beginPath();
      ctx.moveTo(this.mouseX, area.y);
      ctx.lineTo(this.mouseX, area.y + area.height);
      ctx.stroke();

      // Horizontal
      if (this.mouseY >= area.y && this.mouseY <= area.y + area.priceHeight) {
        ctx.beginPath();
        ctx.moveTo(area.x, this.mouseY);
        ctx.lineTo(area.x + area.width, this.mouseY);
        ctx.stroke();

        // Price label on right axis
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
        const price = priceRange.min + (1 - (this.mouseY - area.y) / area.priceHeight) * (priceRange.max - priceRange.min);
        const label = price >= 1 ? price.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : price.toFixed(4);
        const labelW = ctx.measureText(label).width + 16 * this.dpr;
        
        // Premium label box
        ctx.fillStyle = this.colors.crosshair;
        ctx.beginPath();
        // roundRect is natively supported in modern browsers
        if (ctx.roundRect) {
          ctx.roundRect(area.x + area.width + 2 * this.dpr, this.mouseY - 12 * this.dpr, labelW, 24 * this.dpr, 4 * this.dpr);
        } else {
          ctx.fillRect(area.x + area.width + 2 * this.dpr, this.mouseY - 12 * this.dpr, labelW, 24 * this.dpr);
        }
        ctx.fill();

        ctx.fillStyle = '#111827'; // Dark text for contrast against the blue label
        ctx.font = `600 ${11 * this.dpr}px ${this._getFont()}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, area.x + area.width + 2 * this.dpr + labelW / 2, this.mouseY);
      }
    }

    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    // Highlight hovered candle
    if (this.hoveredCandle) {
      const idx = this.hoveredCandle.index - this.visibleStart;
      const candleW = this._getCandleWidth();
      const x = area.x + idx * candleW;
      ctx.fillStyle = this.colors.crosshair;
      ctx.globalAlpha = 0.06;
      ctx.fillRect(x, area.y, candleW, area.height);
      ctx.globalAlpha = 1;
    }
  }

  // ─── Utilities ───────────────────────────────────────────────────

  setActiveTool(tool) {
    this.activeTool = tool;
    this.currentDrawing = null; // reset any active drawing
    this.isDrawingActive = false;
    
    if (tool === 'deleteAll') {
      this.clearDrawings();
    }
  }

  _niceStep(range, targetTicks) {
    const rough = range / targetTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const residual = rough / mag;
    let nice;
    if (residual <= 1.5) nice = 1;
    else if (residual <= 3) nice = 2;
    else if (residual <= 7) nice = 5;
    else nice = 10;
    return nice * mag;
  }

  _getFont() {
    return "'Inter', -apple-system, sans-serif";
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  destroy() {
    this.overlayCanvas.removeEventListener('mousemove', this._onMouseMove);
    this.overlayCanvas.removeEventListener('mouseleave', this._onMouseLeave);
    this.overlayCanvas.removeEventListener('wheel', this._onWheel);
    this.overlayCanvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);

    if (this.mainCanvas.parentNode) this.mainCanvas.parentNode.removeChild(this.mainCanvas);
    if (this.overlayCanvas.parentNode) this.overlayCanvas.parentNode.removeChild(this.overlayCanvas);
  }

  // ─── Undo/Redo ───────────────────────────────────────────────────

  undo() {
    if (this.drawings.length > 0) {
      this.redoList.push(this.drawings.pop());
      this.renderMain();
    }
  }

  redo() {
    if (this.redoList.length > 0) {
      this.drawings.push(this.redoList.pop());
      this.renderMain();
    }
  }

  clearDrawings() {
    if (this.drawings.length > 0) {
      this.redoList = [...this.drawings].reverse().concat(this.redoList);
      this.drawings = [];
      this.renderMain();
    }
  }
}
