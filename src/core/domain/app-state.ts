import type { Employee } from './employee';
import type { Period } from './period';
import type { Ticket } from './ticket';
import type { PPALog } from './ppa';

export interface CountrySummary {
  country: string;
  totalEmployees: number;
  chargeableCount: number;
  atRiskCount: number;
  unchargeableCount: number;
  avgChargeability: number;
  availableHours: number;
}

export interface AppState {
  period: Period;
  employees: Employee[];
  tickets: Ticket[];
  ppaLogs: PPALog[];
  countrySummaries: CountrySummary[];
  lastSyncAt: string | null;
  lastRecalcAt: string | null;
}
