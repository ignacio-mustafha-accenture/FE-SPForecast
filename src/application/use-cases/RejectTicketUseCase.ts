import type { Ticket } from '@/src/core/domain/ticket';
import type { ITicketRepository } from '@/src/core/ports/ITicketRepository';

export class RejectTicketUseCase {
  constructor(private repo: ITicketRepository) {}

  execute(id: string, reason: string): Promise<Ticket> {
    return this.repo.rejectTicket(id, reason);
  }
}
