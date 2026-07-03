export type TicketType = 'newproj' | 'ongoing' | 'pto' | 'sick' | 'nj' | 'baja';

export interface Ticket {
  id: string;
  employeeId: string;
  employeeName: string;
  country: string;
  type: TicketType;
  hours: number;
  startDate: string;
  endDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketPayload {
  employeeId: string;
  type: TicketType;
  hours: number;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface UpdateTicketPayload {
  hours?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}
