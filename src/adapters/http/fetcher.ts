import { API_BASE_URL } from '@/src/lib/constants';

export type ServerCtx = { cookieHeader: string };
export type ClientCtx = { credentials: 'include' };
export type FetcherCtx = ServerCtx | ClientCtx;

function isServerCtx(ctx: FetcherCtx): ctx is ServerCtx {
  return 'cookieHeader' in ctx;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createFetcher(ctx: FetcherCtx) {
  return async function fetcher<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const method = (options.method ?? 'GET').toUpperCase();
    const headers: Record<string, string> = {
      ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string>),
    };

    if (isServerCtx(ctx)) {
      headers['Cookie'] = ctx.cookieHeader;
    }

    const baseURL = isServerCtx(ctx) ? API_BASE_URL : '';
    const res = await fetch(`${baseURL}${path}`, {
      ...options,
      headers,
      ...(!isServerCtx(ctx) ? { credentials: ctx.credentials } : {}),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new ApiError(res.status, text);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  };
}
