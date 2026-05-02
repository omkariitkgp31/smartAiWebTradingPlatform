import * as dummy from '../dummyData';

export async function getAssets(): Promise<any> {
  return dummy.getAssets();
}

export async function getAssetDetail(symbol: string): Promise<any> {
  return dummy.getAssetDetail(symbol);
}

export async function getOrderBook(symbol: string): Promise<any> {
  return dummy.getOrderBook(symbol);
}

export async function getCandles(symbol: string, interval: string = '1m', count?: number): Promise<any> {
  return dummy.getCandles(symbol, interval, count);
}

export async function getAssetStats(symbol: string): Promise<any> {
  const candles = dummy.getCandles(symbol, '1m');
  if (!candles || candles.length === 0) {
    return { symbol, volume_24h: 0, high_24h: 0, low_24h: 0, change_24h_pct: 0, open_24h: 0 };
  }
  const high_24h = Math.max(...candles.map((c: any) => c.high));
  const low_24h = Math.min(...candles.map((c: any) => c.low));
  const volume_24h = candles.reduce((sum: number, c: any) => sum + (c.volume || 0), 0);
  const open_24h = candles[0].open;
  const currentPrice = candles[candles.length - 1].close;
  const change_24h_pct = open_24h > 0 ? ((currentPrice - open_24h) / open_24h) * 100 : 0;
  return { symbol, volume_24h, high_24h, low_24h, change_24h_pct, open_24h };
}
