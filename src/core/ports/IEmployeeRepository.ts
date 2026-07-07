import type { Employee } from '../domain/employee';
import type { EmployeeFilter, Page } from '../domain/pagination';

export interface EmployeeUpdatePayload {
  newEid?: string;
  name?: string;
  cl?: number | null;
  client?: string | null;
  offering?: string | null;
  rollOn?: string | null;
  rollOff?: string | null;
  accountManager?: string | null;
  notes?: string | null;
  nextClient?: string | null;
  chargeabilityPct?: number | null;
}

export interface IEmployeeRepository {
  list(filter: EmployeeFilter): Promise<Page<Employee>>;
  update(id: string, data: EmployeeUpdatePayload): Promise<void>;
  getById(id: string): Promise<Employee>;
}
