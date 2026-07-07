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
  unassignedCount: number;
  leaveCount: number;
  avgChargeability: number;
  availableHours: number;
}

export interface AppState {
  period: Period;
  periods: Period[];
  employees: Employee[];
  tickets: Ticket[];
  ppaLogs: PPALog[];
  countrySummaries: CountrySummary[];
  targets: Record<string, number>;
  lastSyncAt: string | null;
  lastRecalcAt: string | null;
}
