import { apiFetch } from './client';

export async function getBots(): Promise<any> {
  return apiFetch('/api/v1/bots');
}

export async function startBot(botId: string): Promise<any> {
  return apiFetch(`/api/v1/bots/${botId}/start`, { method: 'POST' });
}

export async function stopBot(botId: string): Promise<any> {
  return apiFetch(`/api/v1/bots/${botId}/stop`, { method: 'POST' });
}

export async function updateBotConfig(botId: string, config: any): Promise<any> {
  return apiFetch(`/api/v1/bots/${botId}/config`, {
    method: 'PATCH',
    body: JSON.stringify(config),
  });
}
