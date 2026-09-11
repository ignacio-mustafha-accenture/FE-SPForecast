import type { Employee } from '../domain/employee';
import type { ForecastTotals } from '../domain/forecast-totals';
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
  // Todo el set filtrado en una sola pagina, para vistas que no paginan
  listAll(filter: EmployeeFilter): Promise<Page<Employee>>;
  // Totales agregados sobre todo el set filtrado, sin paginar
  totals(filter: EmployeeFilter, windowOffset: number): Promise<ForecastTotals>;
  update(id: string, data: EmployeeUpdatePayload): Promise<void>;
  getById(id: string): Promise<Employee>;
  assignRealEid(eid: string, newEid: string, newName?: string): Promise<{ ok: boolean; new_eid: string }>;
}
