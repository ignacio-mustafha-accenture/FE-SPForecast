export type TicketType = 'newproj' | 'ongoing' | 'pto' | 'sick' | 'nj' | 'baja';

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
}

export interface CreateTicketPayload {
  eid: string;
  type: TicketType;
  detail?: string;
  client_name?: string;
  chargeability_pct?: number;
  hours_to_move?: number;
  from_period?: string;
  to_period?: string;
  comments?: string;
}

export interface UpdateTicketPayload {
  detail?: string;
  client_name?: string;
  chargeability_pct?: number;
  hours_to_move?: number;
  from_period?: string;
  to_period?: string;
  comments?: string;
}
