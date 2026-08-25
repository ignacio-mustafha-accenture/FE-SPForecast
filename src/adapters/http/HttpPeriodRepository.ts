import type { CalendarPeriod } from '@/src/core/domain/period';
import type { IPeriodRepository } from '@/src/core/ports/IPeriodRepository';

import { createFetcher, type FetcherCtx } from './fetcher';
import type { RawCalendarPeriod } from './types';

export class HttpPeriodRepository implements IPeriodRepository {
  private fetch: ReturnType<typeof createFetcher>;

  constructor(ctx: FetcherCtx) {
    this.fetch = createFetcher(ctx);
  }

  async listAll(): Promise<CalendarPeriod[]> {
    const raw = await this.fetch<{ items: RawCalendarPeriod[] }>('/api/periods');
    return raw.items.map((p) => ({
      name: p.period_name,
      startDate: p.start_date,
      endDate: p.end_date,
    }));
  }
}
