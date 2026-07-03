import type { IPPARepository } from '@/src/core/ports/IPPARepository';

export class ApplyPPAUseCase {
  constructor(private repo: IPPARepository) {}

  execute(employeeId: string, periodLabel: string): Promise<void> {
    return this.repo.apply(employeeId, periodLabel);
  }
}
