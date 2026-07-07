import type { IEmployeeRepository, EmployeeUpdatePayload } from '@/src/core/ports/IEmployeeRepository';

export class UpdateEmployeeUseCase {
  constructor(private repo: IEmployeeRepository) {}

  execute(id: string, data: EmployeeUpdatePayload): Promise<void> {
    return this.repo.update(id, data);
  }
}
