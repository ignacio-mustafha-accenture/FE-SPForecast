export interface RawPeriod {
  id: string;
  period_name: string;
  label: string;
  sah: number;
  isCurrent: boolean;
  start_date: string;
  end_date: string;
}

export interface RawEmployee {
  EID: string;
  Name: string;
  Country: string;
  CL: string;
  FTE: number;
  HireDate: string;
  Manager: string;
  TEApprover: string;
  ProjectType: string;
  Client: string;
  AccountManager: string;
  Office: string;
  RollOn: string;
  RollOff: string;
  FAD: string;
  DaysToAvailable: number;
  ChargeabilityPct: number;
  NextPTO: string | null;
  NextPTOEnd: string | null;
  NextPTOHours: number | null;
  NextClientPTO: string | null;
  Notes: string | null;
  NewJoiner: boolean;
  TerminationDate: string | null;
  Charge: boolean;
  NJFormat: string | null;
  chg: number[];
  sah: number[];
  cp: number[];
  sickDays: number[];
  ppaAdj: number[];
}

export interface RawTicket {
  id: string;
  type: string;
  eid: string;
  detail: string | null;
  status: string;
  date: string;
  by: string;
  nj_name: string | null;
  cl: string | null;
  location: string | null;
  people_lead: string | null;
  client_name: string | null;
  offering_type: string | null;
  chargeability_pct: number | null;
  hours_to_move: number | null;
  from_period: string | null;
  to_period: string | null;
  comments: string | null;
  eid_name?: string | null;
  eid_country?: string | null;
}

export interface RawPPALog {
  id: string;
  eid: string;
  name: string;
  from: string;
  to: string;
  hs: number;
  reason: string;
  date: string;
  country?: string | null;
}

export interface RawPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface RawTargets {
  general: number;
  [country: string]: number;
}

export interface RawAppState {
  periods: RawPeriod[];
  employees: RawEmployee[];
  targets: RawTargets;
  tickets: RawTicket[];
  ppa_log: RawPPALog[];
}

export interface RawUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  eid: string | null;
}
