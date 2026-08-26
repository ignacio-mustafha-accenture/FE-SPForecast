import type { IPPARepository } from '@/src/core/ports/IPPARepository';

export class ApprovePPAUseCase {
  constructor(private repo: IPPARepository) {}

  execute(ppaId: string): Promise<void> {
    return this.repo.approve(ppaId);
  }
}