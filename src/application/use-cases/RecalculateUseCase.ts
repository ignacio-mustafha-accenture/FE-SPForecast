import type { IAdminRepository } from '@/src/core/ports/IAdminRepository';

export class RecalculateUseCase {
  constructor(private repo: IAdminRepository) {}

  execute(periodName: string): Promise<void> {
    return this.repo.recalculate(periodName);
  }
}
