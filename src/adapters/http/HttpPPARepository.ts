import type { Employee } from '@/src/core/domain/employee';
import type { PPALog, PPACreatePayload } from '@/src/core/domain/ppa';
import type { Page, PPAFilter } from '@/src/core/domain/pagination';
import type { IPPARepository } from '@/src/core/ports/IPPARepository';

import { createFetcher, type FetcherCtx } from './fetcher';
import { mapRawPPALog } from './mappers';
import type { RawPage, RawPPALog } from './types';

export class HttpPPARepository implements IPPARepository {
  private fetch: ReturnType<typeof createFetcher>;

  constructor(ctx: FetcherCtx) {
    this.fetch = createFetcher(ctx);
  }

  async list(filter: PPAFilter): Promise<Page<PPALog>> {
    const params = new URLSearchParams();
    if (filter.eid) params.set('eid', filter.eid);
    if (filter.fromPeriod) params.set('from_period', filter.fromPeriod);
    params.set('page', String(filter.page ?? 1));
    params.set('page_size', String(filter.pageSize ?? 10));
    const raw = await this.fetch<RawPage<RawPPALog>>(`/api/ppa?${params}`);
    const emptyMap = new Map<string, Employee>();
    return {
      items: raw.items.map((p) => mapRawPPALog(p, emptyMap)),
      total: raw.total,
      page: raw.page,
      pageSize: raw.page_size,
      pages: raw.pages,
    };
  }

  async create(payload: PPACreatePayload): Promise<void> {
    await this.fetch<void>('/api/ppa', {
      method: 'POST',
      body: JSON.stringify({
        eid: payload.eid,
        from_period: payload.fromPeriod,
        to_period: payload.toPeriod,
        hours: payload.hours,
        reason: payload.reason,
      }),
    });
  }
}
