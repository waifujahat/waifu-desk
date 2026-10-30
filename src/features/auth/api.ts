import { invoke, isTauri } from '@tauri-apps/api/core';

export interface AuthProfile {
  id: number;
  email: string;
  display_name: string;
  roles: string[];
}

export interface AuthSession {
  token: string;
  profile: AuthProfile;
}

interface LoginResponse {
  token: string;
  token_type: string;
}

interface RegisterResponse {
  id: number;
  message: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  display_name: string;
}

export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Aplikasi Tauri menggunakan Rust IPC.
  if (isTauri()) {
    const headers = new Headers(options.headers);

    const authorization = headers.get('Authorization');

    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

    let body: unknown = null;

    if (typeof options.body === 'string') {
      body = JSON.parse(options.body);
    }

    let result: {
      status: number;
      body: unknown;
    };

    try {
      result = await invoke('auth_api_request', {
        method: (options.method ?? 'GET').toUpperCase(),
        path,
        body,
        token,
      });
    } catch (error) {
      throw new Error(typeof error === 'string' ? error : 'Tidak dapat terhubung ke Rust API.');
    }

    if (result.status < 200 || result.status >= 300) {
      const responseBody = result.body;

      const message =
        responseBody !== null &&
        typeof responseBody === 'object' &&
        'error' in responseBody &&
        typeof responseBody.error === 'string'
          ? responseBody.error
          : `Permintaan gagal (HTTP ${result.status})`;

      throw new AuthApiError(result.status, message);
    }

    if (result.status === 204) {
      return undefined as T;
    }

    return result.body as T;
  }

  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      cache: 'no-store',
      ...options,
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke WaifuDesk API.');
  }

  if (!response.ok) {
    let message = `Permintaan gagal (HTTP ${response.status})`;

    try {
      const body: unknown = await response.json();

      if (
        body !== null &&
        typeof body === 'object' &&
        'error' in body &&
        typeof body.error === 'string'
      ) {
        message = body.error;
      }
    } catch {
      // Error default jika bukan JSON
    }

    throw new AuthApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function registerAccount(payload: RegisterPayload): Promise<RegisterResponse> {
  return apiRequest('/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export function loginAccount(email: string, password: string): Promise<LoginResponse> {
  return apiRequest('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
}

export function getMyProfile(token: string): Promise<AuthProfile> {
  return apiRequest('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function logoutAccount(token: string): Promise<void> {
  return apiRequest('/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
