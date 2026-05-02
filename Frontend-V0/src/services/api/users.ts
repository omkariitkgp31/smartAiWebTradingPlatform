import { apiFetch, getToken } from './client';
import { FAKE_TOKEN } from './auth';

export async function getUser(): Promise<any> {
  if (getToken() === FAKE_TOKEN) {
    return { id: 'fake-user-dandip', username: 'dandip', email: 'dandip@synthetic-bull.local' };
  }
  return apiFetch('/api/identity/me');
}
