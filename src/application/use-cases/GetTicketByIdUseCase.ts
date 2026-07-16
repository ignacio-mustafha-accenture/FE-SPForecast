import type { Ticket } from '@/src/core/domain/ticket';
import type { ITicketRepository } from '@/src/core/ports/ITicketRepository';

export class GetTicketByIdUseCase {
  constructor(private repo: ITicketRepository) {}

  execute(id: string): Promise<Ticket> {
    return this.repo.getById(id);
  }
}
