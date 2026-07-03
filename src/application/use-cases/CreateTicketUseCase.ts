import type { Ticket, CreateTicketPayload } from '@/src/core/domain/ticket';
import type { ITicketRepository } from '@/src/core/ports/ITicketRepository';

export class CreateTicketUseCase {
  constructor(private repo: ITicketRepository) {}

  execute(payload: CreateTicketPayload): Promise<Ticket> {
    return this.repo.create(payload);
  }
}
