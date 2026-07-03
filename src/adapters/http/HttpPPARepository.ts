import type { IPPARepository } from '@/src/core/ports/IPPARepository';

import { createFetcher, type FetcherCtx } from './fetcher';

export class HttpPPARepository implements IPPARepository {
  private fetch: ReturnType<typeof createFetcher>;

  constructor(ctx: FetcherCtx) {
    this.fetch = createFetcher(ctx);
  }

  async apply(employeeId: string, periodLabel: string): Promise<void> {
    return this.fetch<void>('/api/ppa', {
      method: 'POST',
      body: JSON.stringify({ employeeId, periodLabel }),
    });
  }
}
