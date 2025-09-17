import type { User } from '../types/auth';
import { apiFetch } from './apiClient';

export interface LoginPayload {
  username: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<User> {
  const user = await apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return user as User;
}
