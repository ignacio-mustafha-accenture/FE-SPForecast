export type TicketType = 'newproj' | 'ongoing' | 'pto' | 'sick' | 'nj' | 'baja';
export type ScenarioType = 'assumption' | 'effective';

export interface Ticket {
  id: string;
  type: TicketType;
  employeeId: string;
  employeeName: string;
  country: string;
  detail: string | null;
  status: string;
  date: string;
  by: string;
  clientName: string | null;
  offeringType: string | null;
  chargeabilityPct: number | null;
  hoursToMove: number | null;
  fromPeriod: string | null;
  toPeriod: string | null;
  comments: string | null;
  njName: string | null;
  startDate: string | null;
  endDate: string | null;
  cl: string | null;
  location: string | null;
  peopleLead: string | null;
  rejectionReason: string | null;
  scenarioType: ScenarioType;
}

export interface CreateTicketPayload {
  eid?: string;
  type: TicketType;
  detail?: string;
  status?: string;
  client_name?: string;
  offering_type?: string;
  chargeability_pct?: number;
  start_date?: string;
  end_date?: string;
  nj_name?: string;
  cl?: number;
  location?: string;
  people_lead?: string;
  eid_accenture?: string;
  hours_to_move?: number;
  from_period?: string;
  to_period?: string;
  comments?: string;
  scenario_type?: ScenarioType;
}

export interface UpdateTicketPayload {
  detail?: string;
  status?: string;
  client_name?: string;
  offering_type?: string;
  chargeability_pct?: number;
  start_date?: string;
  end_date?: string;
  hours_to_move?: number;
  from_period?: string;
  to_period?: string;
  comments?: string;
}
