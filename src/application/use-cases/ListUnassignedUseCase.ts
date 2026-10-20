import type { UnassignedFilter, UnassignedPage } from '@/src/core/domain/unassigned';
import type { IEmployeeRepository } from '@/src/core/ports/IEmployeeRepository';

export class ListUnassignedUseCase {
  constructor(private repo: IEmployeeRepository) {}

  execute(filter: UnassignedFilter): Promise<UnassignedPage> {
    return this.repo.listUnassigned(filter);
  }
}
