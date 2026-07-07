import type { Page, TicketFilter } from '@/src/core/domain/pagination';
import type { Ticket } from '@/src/core/domain/ticket';
import type { ITicketRepository } from '@/src/core/ports/ITicketRepository';

export class ListTicketsUseCase {
  constructor(private repo: ITicketRepository) {}

  execute(filter: TicketFilter): Promise<Page<Ticket>> {
    return this.repo.list(filter);
  }
}
