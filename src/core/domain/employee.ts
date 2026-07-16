export type Country = 'AR' | 'MX' | 'CR';
export type ScenarioType = 'assumption' | 'effective';

export type ChargeabilityStatus = 'green' | 'yellow' | 'red' | 'unassigned' | 'leave';

export interface Employee {
  id: string;
  name: string;
  email: string;
  country: Country;
  level: string;
  project: string | null;       // client name (alias for drawer compat)
  client: string | null;
  projectType: string | null;
  manager: string | null;
  rollOn: string | null;
  rollOff: string | null;
  fad: string | null;
  daysToAvailable: number;
  hireDate: string | null;
  nextPTO: string | null;
  nextPTOHours: number | null;
  newJoiner: boolean;
  charge: boolean;
  chg: number[];
  sah: number[];
  cp: number[];
  chargeabilityStatus: ChargeabilityStatus;
  chargeabilityPercent: number;
  availableHours: number;
  totalHours: number;
  notes: string;
  scenarioType: ScenarioType;
}
