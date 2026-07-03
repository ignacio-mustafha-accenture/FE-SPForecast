import type { Ticket, UpdateTicketPayload } from '@/src/core/domain/ticket';
import type { ITicketRepository } from '@/src/core/ports/ITicketRepository';

export class UpdateTicketUseCase {
  constructor(private repo: ITicketRepository) {}

  execute(id: string, payload: UpdateTicketPayload): Promise<Ticket> {
    return this.repo.update(id, payload);
  }
}
