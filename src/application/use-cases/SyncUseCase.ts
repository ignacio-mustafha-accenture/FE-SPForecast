import type { IAdminRepository } from '@/src/core/ports/IAdminRepository';

export class SyncUseCase {
  constructor(private repo: IAdminRepository) {}

  execute(): Promise<void> {
    return this.repo.sync();
  }
}
