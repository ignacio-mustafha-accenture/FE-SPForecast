import type { IPPARepository } from '@/src/core/ports/IPPARepository';

export class ReversePPAUseCase {
  constructor(private repo: IPPARepository) {}

  execute(ppaId: string): Promise<void> {
    return this.repo.reverse(ppaId);
  }
}
