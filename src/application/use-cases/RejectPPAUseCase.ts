import type { IPPARepository } from '@/src/core/ports/IPPARepository';

export class RejectPPAUseCase {
  constructor(private repo: IPPARepository) {}

  execute(ppaId: string, reason: string): Promise<void> {
    return this.repo.reject(ppaId, reason);
  }
}