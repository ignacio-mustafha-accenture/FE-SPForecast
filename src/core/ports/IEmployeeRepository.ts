import type { Employee } from '../domain/employee';

export interface IEmployeeRepository {
  update(id: string, data: Partial<Pick<Employee, 'notes' | 'project'>>): Promise<Employee>;
}
