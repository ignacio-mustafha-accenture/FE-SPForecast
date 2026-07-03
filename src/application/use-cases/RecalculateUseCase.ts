import type { IAdminRepository } from '@/src/core/ports/IAdminRepository';

export class RecalculateUseCase {
  constructor(private repo: IAdminRepository) {}

  execute(): Promise<void> {
    return this.repo.recalculate();
  }
}
