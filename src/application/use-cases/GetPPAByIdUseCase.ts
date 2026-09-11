import type { PPALog } from '@/src/core/domain/ppa';
import type { IPPARepository } from '@/src/core/ports/IPPARepository';

export class GetPPAByIdUseCase {
  constructor(private repo: IPPARepository) {}

  execute(ppaId: string): Promise<PPALog> {
    return this.repo.getById(ppaId);
  }
}
