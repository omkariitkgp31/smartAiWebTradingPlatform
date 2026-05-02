import { apiFetch } from './client';

export async function pauseMarket(): Promise<any> {
  return apiFetch('/api/v1/admin/market/pause', { method: 'PATCH' });
}

export async function resumeMarket(): Promise<any> {
  return apiFetch('/api/v1/admin/market/resume', { method: 'PATCH' });
}

export async function updateMarketParams(symbol: string, params: any): Promise<any> {
  return apiFetch(`/api/v1/admin/market/params/${symbol}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
}

export async function getEngineStats(): Promise<any> {
  return apiFetch('/api/v1/admin/engine/stats');
}
