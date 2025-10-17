import { apiFetch } from './apiClient';
import type { AdminUser, AdminUserPayload } from '../types/admin';

export const adminUserService = {
  async listUsers(): Promise<AdminUser[]> {
    const users = await apiFetch('/api/admin/users');
    return users as AdminUser[];
  },

  async createUser(payload: AdminUserPayload & { password: string }): Promise<AdminUser> {
    const body = JSON.stringify({
      username: payload.username,
      password: payload.password,
      role: payload.role,
      assignedBrandIds: payload.assignedBrandIds,
      dailyCreditLimit: payload.dailyCreditLimit ?? 0
    });

    const created = await apiFetch('/api/admin/users', {
      method: 'POST',
      body
    });

    return created as AdminUser;
  },

  async updateUser(userId: number, payload: Partial<AdminUserPayload> & { password?: string }): Promise<AdminUser> {
    const updatePayload: Record<string, unknown> = {};

    if (typeof payload.username === 'string') {
      updatePayload.username = payload.username;
    }

    if (typeof payload.password === 'string' && payload.password.length > 0) {
      updatePayload.password = payload.password;
    }

    if (typeof payload.role === 'string') {
      updatePayload.role = payload.role;
    }

    if (Array.isArray(payload.assignedBrandIds)) {
      updatePayload.assignedBrandIds = payload.assignedBrandIds;
    }

    if (typeof payload.dailyCreditLimit === 'number') {
      updatePayload.dailyCreditLimit = payload.dailyCreditLimit;
    }

    const updated = await apiFetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updatePayload)
    });

    return updated as AdminUser;
  },

  async deleteUser(userId: number): Promise<void> {
    await apiFetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
  }
};
