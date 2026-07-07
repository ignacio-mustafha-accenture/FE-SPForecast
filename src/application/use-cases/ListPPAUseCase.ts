import type { PPALog } from '@/src/core/domain/ppa';
import type { Page, PPAFilter } from '@/src/core/domain/pagination';
import type { IPPARepository } from '@/src/core/ports/IPPARepository';

export class ListPPAUseCase {
  constructor(private repo: IPPARepository) {}

  execute(filter: PPAFilter): Promise<Page<PPALog>> {
    return this.repo.list(filter);
  }
}
