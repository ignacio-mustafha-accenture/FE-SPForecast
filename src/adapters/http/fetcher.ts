import { API_BASE_URL } from '@/src/lib/constants';

// Server-side calls need an absolute URL. It is read from a non-NEXT_PUBLIC
// variable so the value comes from the container environment at request time —
// NEXT_PUBLIC_* is inlined during `next build`, which bakes in whatever the
// build host had (or the localhost fallback) and cannot be overridden on deploy.
function resolveServerBaseUrl(): string {
  return process.env.API_BASE_URL ?? API_BASE_URL;
}

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

    const baseURL = isServerCtx(ctx) ? resolveServerBaseUrl() : '';
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
