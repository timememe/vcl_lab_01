import { apiFetch } from './apiClient';
import type { Setting, SettingPayload, SettingCategory } from '../types/settings';

export const settingsService = {
  // Get all settings (optionally filter by category) - admin only
  async getAllSettings(category?: SettingCategory): Promise<Setting[]> {
    const url = category ? `/api/admin/settings?category=${category}` : '/api/admin/settings';
    return await apiFetch(url) as Setting[];
  },

  // Get active settings by category - for forms
  async getActiveSettings(category: SettingCategory): Promise<Setting[]> {
    return await apiFetch(`/api/settings/${category}`) as Setting[];
  },

  // Create new setting - admin only
  async createSetting(payload: SettingPayload): Promise<Setting> {
    return await apiFetch('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    }) as Setting;
  },

  // Update setting - admin only
  async updateSetting(id: number, payload: SettingPayload): Promise<Setting> {
    return await apiFetch(`/api/admin/settings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }) as Setting;
  },

  // Delete setting - admin only
  async deleteSetting(id: number): Promise<void> {
    await apiFetch(`/api/admin/settings/${id}`, {
      method: 'DELETE'
    });
  },

  // Toggle setting active status - admin only
  async toggleSetting(id: number): Promise<Setting> {
    return await apiFetch(`/api/admin/settings/${id}/toggle`, {
      method: 'PATCH'
    }) as Setting;
  }
};
