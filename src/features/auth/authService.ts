import type { User, LoginResponse } from '@/types/auth';
import { apiFetch } from '@/lib/apiClient';

export interface LoginPayload {
  username: string;
  password: string;
}

const TOKEN_KEY = 'vcl_auth_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(payload: LoginPayload): Promise<User> {
  const response = await apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  }) as LoginResponse;

  // Store JWT token
  setToken(response.token);

  return response.user;
}

export async function verifyToken(): Promise<User | null> {
  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    const user = await apiFetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }) as User;
    return user;
  } catch (error) {
    // Token is invalid, remove it
    removeToken();
    return null;
  }
}
