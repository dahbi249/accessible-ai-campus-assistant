import type { ApiMode } from '../types/api';
import { loadAuthToken, saveAuthToken } from '../utils/sessionStorage';

export class ApiError extends Error {
  statusCode?: number;
  errorCode?: string;

  constructor(message: string, statusCode?: number, errorCode?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

const DEFAULT_TIMEOUT_MS = 15000;

let currentApiMode: ApiMode =
  import.meta.env.VITE_USE_MOCK_API === 'false' ? 'live' : 'mock';

let currentAuthToken: string | null = loadAuthToken();
const unauthorizedListeners = new Set<() => void>();

export function getConfiguredBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== 'string') {
    return '';
  }
  return raw.trim().replace(/\/+$/, '');
}

export function getBackendBaseUrlDisplay(): string {
  const base = getConfiguredBaseUrl();
  return base.length > 0 ? base : '/api/v1 (proxy)';
}

export function getApiMode(): ApiMode {
  return currentApiMode;
}

export function setApiMode(mode: ApiMode): void {
  currentApiMode = mode;
}

export function getAuthToken(): string | null {
  return currentAuthToken;
}

export function setAuthToken(token: string | null): void {
  currentAuthToken = token && token.trim().length > 0 ? token.trim() : null;
  saveAuthToken(currentAuthToken);
}

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export function notifyUnauthorized(): void {
  setAuthToken(null);
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors
    }
  });
}

export function isAuthTokenExpired(token: string | null = currentAuthToken): boolean {
  if (!token) {
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = atob(padded);
    const payload = JSON.parse(decoded) as { exp?: unknown };
    if (typeof payload.exp === 'number' && Number.isFinite(payload.exp)) {
      return Date.now() >= payload.exp * 1000;
    }
    return false;
  } catch {
    return false;
  }
}

export function isSafeHttpUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  const base = getConfiguredBaseUrl();
  // Avoid duplicating /api when VITE_API_BASE_URL ends with /api (e.g. http://localhost:8000/api)
  const normalizedBase =
    base.endsWith('/api') && path.startsWith('/api/')
      ? base.slice(0, -4)
      : base;
  const urlString = `${normalizedBase}${path}`;

  if (!params) {
    return urlString;
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && String(value).trim() !== '') {
      search.set(key, String(value).trim());
    }
  }
  const queryString = search.toString();
  return queryString ? `${urlString}?${queryString}` : urlString;
}

export function extractBackendError(
  body: unknown,
  fallbackStatus: number
): { message: string; code?: string } {
  if (!isObject(body)) {
    return { message: `HTTP ${fallbackStatus}` };
  }

  if (isObject(body.detail)) {
    const detailObj = body.detail;
    const message =
      typeof detailObj.message === 'string'
        ? detailObj.message
        : `HTTP ${fallbackStatus}`;
    const code = typeof detailObj.code === 'string' ? detailObj.code : undefined;
    return { message, code };
  }

  if (typeof body.detail === 'string') {
    return { message: body.detail };
  }

  if (Array.isArray(body.detail) && body.detail.length > 0) {
    const first = body.detail[0];
    if (isObject(first) && typeof first.msg === 'string') {
      return { message: first.msg, code: 'VALIDATION_ERROR' };
    }
  }

  if (typeof body.message === 'string') {
    return { message: body.message };
  }

  return { message: `HTTP ${fallbackStatus}` };
}

export async function fetchJsonWithTimeout(
  input: string,
  init?: RequestInit,
  externalSignal?: AbortSignal
): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, DEFAULT_TIMEOUT_MS);

  const authHeaders: Record<string, string> = {};
  if (currentAuthToken) {
    authHeaders.Authorization = `Bearer ${currentAuthToken}`;
  }

  try {
    const response = await fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      let parsedMessage = `HTTP ${response.status}`;
      let parsedCode: string | undefined;
      try {
        const body = (await response.json()) as unknown;
        const extracted = extractBackendError(body, response.status);
        parsedMessage = extracted.message;
        parsedCode = extracted.code;
      } catch {
        // Ignore non-JSON error payloads
      }
      if (response.status === 401) {
        parsedCode = parsedCode ?? 'UNAUTHORIZED';
        notifyUnauthorized();
      }
      throw new ApiError(
        `Backend request failed: ${parsedMessage}`,
        response.status,
        parsedCode
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (timedOut) {
        throw new ApiError('Request timed out while waiting for the backend API.');
      }
      throw error;
    }
    throw new ApiError(
      error instanceof Error
        ? `Network error reaching backend: ${error.message}`
        : 'Unexpected network error reaching backend.'
    );
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

export function simulateDelay(ms = 320, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
