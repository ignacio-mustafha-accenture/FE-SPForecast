export type Country = 'AR' | 'MX' | 'CR';

export type ChargeabilityStatus = 'green' | 'yellow' | 'red' | 'unassigned';

export interface Employee {
  id: string;
  name: string;
  email: string;
  country: Country;
  level: string;
  project: string | null;
  chargeabilityStatus: ChargeabilityStatus;
  chargeabilityPercent: number;
  availableHours: number;
  totalHours: number;
  notes: string;
}
