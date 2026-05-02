import { apiFetch, refreshToken_ } from './client';

const FAKE_USERNAME = 'dandip';
const FAKE_PASSWORD = 'bdpBp6?%-Gk+YU)';
export const FAKE_TOKEN = 'fake-token-dandip';

export async function login(email: string, password: string): Promise<any> {
  return apiFetch('/api/identity/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(username: string, email: string, password: string, fullName?: string): Promise<any> {
  return apiFetch('/api/identity/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, full_name: fullName || '' }),
  });
}

export async function refreshToken(refresh_token: string): Promise<any> {
  return refreshToken_(refresh_token);
}

