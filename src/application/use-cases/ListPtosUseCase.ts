import type { PtoFilter, PtoPage } from '@/src/core/domain/pto';
import type { IEmployeeRepository } from '@/src/core/ports/IEmployeeRepository';

export class ListPtosUseCase {
  constructor(private repo: IEmployeeRepository) {}

  execute(filter: PtoFilter): Promise<PtoPage> {
    return this.repo.listPtos(filter);
  }
}
