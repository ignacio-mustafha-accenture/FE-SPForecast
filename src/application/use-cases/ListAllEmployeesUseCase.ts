import type { Employee } from '@/src/core/domain/employee';
import type { EmployeeFilter, Page } from '@/src/core/domain/pagination';
import type { IEmployeeRepository } from '@/src/core/ports/IEmployeeRepository';

// Listado sin paginar: lo usa la vista Forecast, donde los totales tienen que cubrir a
// toda la poblacion filtrada y no solo a la pagina visible.
export class ListAllEmployeesUseCase {
  constructor(private repo: IEmployeeRepository) {}

  execute(filter: EmployeeFilter): Promise<Page<Employee>> {
    return this.repo.listAll(filter);
  }
}
