import { env } from './env';
import { useAuthStore, type AuthSession } from '@/store/auth-store';

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshPromise: Promise<boolean> | undefined;

async function refreshSession(): Promise<boolean> {
  if (refreshPromise === undefined) {
    refreshPromise = fetch(`${env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          useAuthStore.getState().clear();
          return false;
        }
        const session: AuthSession = await response.json();
        useAuthStore.getState().setSession(session);
        return true;
      })
      .finally(() => {
        refreshPromise = undefined;
      });
  }
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);
  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  const makeRequest = (): Promise<Response> => {
    const currentHeaders = new Headers(requestHeaders);
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken !== null) {
      currentHeaders.set('Authorization', `Bearer ${accessToken}`);
    }
    return fetch(new URL(path, env.NEXT_PUBLIC_API_URL), {
      ...requestOptions,
      credentials: 'include',
      headers: currentHeaders,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };

  let response = await makeRequest();
  const isAuthRequest = path.startsWith('/auth/');
  if (response.status === 401 && !isAuthRequest && (await refreshSession())) {
    response = await makeRequest();
  }
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    const responseText = await response.text();
    if (responseText !== '') {
      try {
        const result: unknown = JSON.parse(responseText);
        if (
          typeof result === 'object' &&
          result !== null &&
          'message' in result &&
          typeof result.message === 'string'
        ) {
          message = result.message;
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          throw error;
        }
      }
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
