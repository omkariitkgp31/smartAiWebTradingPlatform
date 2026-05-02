/**
 * Compute Simple Moving Average
 * @param {Array} candles - Array of { open, high, low, close, volume, open_time }
 * @param {number} period - SMA period (e.g., 20)
 * @returns {Array} - Array of { time, value } where time is open_time in seconds
 */
export function computeSMA(candles, period) {
  if (!candles || candles.length < period) return [];
  const result = [];
  let sum = 0;

  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) {
      sum -= candles[i - period].close;
    }
    if (i >= period - 1) {
      result.push({
        time: Math.floor(candles[i].open_time / 1_000_000_000),
        value: sum / period,
      });
    }
  }
  return result;
}

/**
 * Compute Exponential Moving Average
 * @param {Array} candles - Array of { open, high, low, close, volume, open_time }
 * @param {number} period - EMA period (e.g., 50)
 * @returns {Array} - Array of { time, value } where time is open_time in seconds
 */
export function computeEMA(candles, period) {
  if (!candles || candles.length < period) return [];
  const result = [];
  const multiplier = 2 / (period + 1);

  // Seed with SMA of first `period` candles
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let ema = sum / period;
  result.push({
    time: Math.floor(candles[period - 1].open_time / 1_000_000_000),
    value: ema,
  });

  for (let i = period; i < candles.length; i++) {
    ema = (candles[i].close - ema) * multiplier + ema;
    result.push({
      time: Math.floor(candles[i].open_time / 1_000_000_000),
      value: ema,
    });
  }
  return result;
}
