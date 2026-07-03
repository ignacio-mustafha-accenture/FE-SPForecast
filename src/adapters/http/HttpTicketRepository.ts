import type { Ticket, CreateTicketPayload, UpdateTicketPayload } from '@/src/core/domain/ticket';
import type { ITicketRepository } from '@/src/core/ports/ITicketRepository';

import { createFetcher, type FetcherCtx } from './fetcher';

export class HttpTicketRepository implements ITicketRepository {
  private fetch: ReturnType<typeof createFetcher>;

  constructor(ctx: FetcherCtx) {
    this.fetch = createFetcher(ctx);
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
