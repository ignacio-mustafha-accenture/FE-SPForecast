export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface EmployeeFilter {
  country?: string;
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface TicketFilter {
  status?: string;
  type?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface PPAFilter {
  eid?: string;
  fromPeriod?: string;
  page?: number;
  pageSize?: number;
}
