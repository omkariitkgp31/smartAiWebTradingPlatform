// ===== Core API Client =====

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const SYMBOL_MAP: Record<string, string> = {
  'BTC': 'RELIANCE',
  'ETH': 'TCS',
  'SOL': 'HDFCBANK',
  'ADA': 'INFY',
  'DOT': 'ICICIBANK',
  'USDT': 'INR'
};

/**
 * Recursively traverses data and replaces symbols based on SYMBOL_MAP.
 * Handles strings, arrays, and objects.
 */
export function mapSymbols(data: any): any {
  if (!data) return data;
  
  if (typeof data === 'string') {
    return SYMBOL_MAP[data] || data;
  }
  
  if (Array.isArray(data)) {
    return data.map(mapSymbols);
  }
  
  if (typeof data === 'object') {
    const mapped: any = {};
    for (const key in data) {
      let val = data[key];
      // Map both keys (if they are symbols) and values
      if (key === 'symbol' || key === 'asset_symbol' || key === 'base_asset') {
        mapped[key] = SYMBOL_MAP[val] || val;
      } else {
        mapped[key] = mapSymbols(val);
      }
    }
    return mapped;
  }
  
  return data;
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sb_token');
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sb_token', token);
}

export async function refreshToken_(refresh_token: string) {
  const res = await fetch(`${BASE_URL}/api/identity/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token }),
  });
  if (!res.ok) throw new Error('Refresh failed');
  return res.json();
}

export async function apiFetch(path: string, options: RequestInit = {}, _isRetry = false): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Transparent token refresh on 401
  if (res.status === 401 && !_isRetry) {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('sb_refresh') : null;
    if (refreshToken) {
      try {
        const refreshed = await refreshToken_(refreshToken);
        if (refreshed?.token) {
          setToken(refreshed.token);
          return apiFetch(path, options, true);
        }
      } catch (_) { /* fall through to throw */ }
    }
    // Refresh failed — clear auth
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb_token');
      localStorage.removeItem('sb_refresh');
      window.dispatchEvent(new Event('auth:logout'));
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(text || `HTTP ${res.status}`);
  }

  // Some endpoints return empty body on success
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const raw = await res.json();
    return mapSymbols(raw);
  }
  return null;
}
