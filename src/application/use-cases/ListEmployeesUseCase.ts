import type { Employee } from '@/src/core/domain/employee';
import type { EmployeeFilter, Page } from '@/src/core/domain/pagination';
import type { IEmployeeRepository } from '@/src/core/ports/IEmployeeRepository';

export class ListEmployeesUseCase {
  constructor(private repo: IEmployeeRepository) {}

  execute(filter: EmployeeFilter): Promise<Page<Employee>> {
    return this.repo.list(filter);
  }
}
