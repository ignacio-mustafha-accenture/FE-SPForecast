import type { Employee } from '@/src/core/domain/employee';
import type { IEmployeeRepository } from '@/src/core/ports/IEmployeeRepository';

export class UpdateEmployeeUseCase {
  constructor(private repo: IEmployeeRepository) {}

  execute(id: string, data: Partial<Pick<Employee, 'notes' | 'project'>>): Promise<Employee> {
    return this.repo.update(id, data);
  }
}
