/// <reference types="vite/client" />

const inferDefaultBase = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const origin = window.location.origin;
  const isLocalHost = origin.includes('localhost') || origin.includes('127.0.0.1');
  return isLocalHost ? 'http://localhost:10000' : '';
};

const envBase = (import.meta.env?.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');
const DEFAULT_BASE = envBase || inferDefaultBase();

const resolveUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (!DEFAULT_BASE) {
    return path;
  }

  const normalisedPath = path.startsWith('/') ? path : `/${path}`;
  return `${DEFAULT_BASE}${normalisedPath}`;
};

const toHeaders = (init?: HeadersInit): Headers => {
  if (!init) {
    return new Headers();
  }

  if (init instanceof Headers) {
    return new Headers(init);
  }

  if (Array.isArray(init)) {
    return new Headers(init);
  }

  return new Headers(init);
};

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = toHeaders(options.headers);
  headers.set('Content-Type', 'application/json');

  const body = options.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (isFormData) {
    headers.delete('Content-Type');
  }

  const response = await fetch(resolveUrl(path), {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      if (data?.message) {
        message = data.message;
      }
    } catch (_error) {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export { DEFAULT_BASE as API_BASE, apiFetch };
