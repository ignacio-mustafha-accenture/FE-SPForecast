import type { Ticket, CreateTicketPayload, UpdateTicketPayload } from '@/src/core/domain/ticket';
import type { Employee } from '@/src/core/domain/employee';
import type { Page, TicketFilter } from '@/src/core/domain/pagination';
import type { ITicketRepository } from '@/src/core/ports/ITicketRepository';

import { createFetcher, type FetcherCtx } from './fetcher';
import { mapRawTicket } from './mappers';
import type { RawPage, RawTicket } from './types';

export class HttpTicketRepository implements ITicketRepository {
  private fetch: ReturnType<typeof createFetcher>;

  constructor(ctx: FetcherCtx) {
    this.fetch = createFetcher(ctx);
  }

  async list(filter: TicketFilter): Promise<Page<Ticket>> {
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.type) params.set('type', filter.type);
    if (filter.q) params.set('q', filter.q);
    params.set('page', String(filter.page ?? 1));
    params.set('page_size', String(filter.pageSize ?? 10));
    const raw = await this.fetch<RawPage<RawTicket>>(`/api/tickets?${params}`);
    const emptyMap = new Map<string, Employee>();
    return {
      items: raw.items.map((t) => mapRawTicket(t, emptyMap)),
      total: raw.total,
      page: raw.page,
      pageSize: raw.page_size,
      pages: raw.pages,
    };
  }

  async create(payload: CreateTicketPayload): Promise<Ticket> {
    return this.fetch<Ticket>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async update(id: string, payload: UpdateTicketPayload): Promise<Ticket> {
    return this.fetch<Ticket>(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}
