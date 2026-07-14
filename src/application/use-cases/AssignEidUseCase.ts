import type { ITicketRepository } from '@/src/core/ports/ITicketRepository';

export class AssignEidUseCase {
  constructor(private repo: ITicketRepository) {}

  execute(id: string, newEid: string, newName?: string): Promise<{ ok: boolean; new_eid: string }> {
    return this.repo.assignEid(id, newEid, newName);
  }
}
