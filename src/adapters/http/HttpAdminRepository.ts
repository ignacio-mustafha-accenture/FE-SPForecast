import type { IAdminRepository } from '@/src/core/ports/IAdminRepository';

import { createFetcher, type FetcherCtx } from './fetcher';

export class HttpAdminRepository implements IAdminRepository {
  private fetch: ReturnType<typeof createFetcher>;

  constructor(ctx: FetcherCtx) {
    this.fetch = createFetcher(ctx);
  }

  async recalculate(periodName: string): Promise<void> {
    return this.fetch<void>(`/api/recalculate/${encodeURIComponent(periodName)}`, { method: 'POST' });
  }

  async sync(): Promise<void> {
    return this.fetch<void>('/api/sync', { method: 'POST' });
  }
}
