import type { IPPARepository } from '@/src/core/ports/IPPARepository';
import type { PPACreatePayload } from '@/src/core/domain/ppa';

export class ApplyPPAUseCase {
  constructor(private repo: IPPARepository) {}

  execute(payload: PPACreatePayload): Promise<void> {
    return this.repo.create(payload);
  }
}
