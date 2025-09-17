import type { UsageRecord, UsageUpdatePayload } from '../types/usage';
import { apiFetch } from './apiClient';

export async function fetchUsage(): Promise<UsageRecord> {
  const usage = await apiFetch('/api/usage');
  return usage as UsageRecord;
}

export async function updateUsageLimits(payload: UsageUpdatePayload): Promise<UsageRecord> {
  const updated = await apiFetch('/api/usage/limits', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return updated as UsageRecord;
}

export async function incrementUsage(categoryId: string, creditsUsed = 1): Promise<UsageRecord> {
  const updated = await apiFetch('/api/usage/increment', {
    method: 'POST',
    body: JSON.stringify({ categoryId, creditsUsed })
  });
  return updated as UsageRecord;
}

export async function resetUsage(): Promise<UsageRecord> {
  const reset = await apiFetch('/api/usage/reset', {
    method: 'POST'
  });
  return reset as UsageRecord;
}
