import type {
  RequestOptions,
  StudentLoginRequest,
  StudentLoginResponse,
} from '../types/api';
import {
  ApiError,
  buildUrl,
  fetchJsonWithTimeout,
  getApiMode,
  getAuthToken,
  isAuthTokenExpired,
  isObject,
  onUnauthorized,
  setApiMode,
  setAuthToken,
} from './httpClient';

export const authService = {
  async loginStudent(
    credentials: StudentLoginRequest,
    options?: RequestOptions
  ): Promise<StudentLoginResponse> {
    if (getApiMode() === 'mock') {
      throw new ApiError(
        'Student credential login requires a live backend authentication server.',
        400,
        'MOCK_AUTH_UNAVAILABLE'
      );
    }

    const endpoint = buildUrl('/api/v1/auth/login');
    const payload = await fetchJsonWithTimeout(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      },
      options?.signal
    );

    if (!isObject(payload)) {
      throw new ApiError('Malformed response from /api/v1/auth/login.');
    }

    const token =
      typeof payload.access_token === 'string'
        ? payload.access_token
        : typeof payload.token === 'string'
        ? payload.token
        : null;

    if (!token) {
      throw new ApiError('Login succeeded but response omitted access_token.');
    }

    setAuthToken(token);
    return {
      access_token: token,
      token_type: typeof payload.token_type === 'string' ? payload.token_type : 'Bearer',
    };
  },

  logoutStudent(): void {
    setAuthToken(null);
  },

  getToken: getAuthToken,
  setToken: setAuthToken,
  isTokenExpired: isAuthTokenExpired,
  onUnauthorized,
  getApiMode,
  setApiMode,
};
