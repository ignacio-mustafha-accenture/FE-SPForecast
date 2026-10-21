import type { Page } from './pagination';

export type PtoStatus = 'current' | 'upcoming';

export const PTO_STATUSES: PtoStatus[] = ['current', 'upcoming'];

export type PtoSort = 'name' | 'country' | 'level' | 'start' | 'end' | 'hours' | 'status';

export interface PtoRow {
  /** id de la ausencia: un empleado puede tener varios PTOs. */
  id: number;
  /** eid del empleado, para enlazar a su ficha. */
  eid: string;
  name: string;
  country: string;
  level: string;
  client: string | null;
  start: string;
  end: string;
  hours: number | null;
  status: PtoStatus;
}

export interface PtoFilter {
  country?: string;
  offering?: string;
  level?: string;
  q?: string;
  status?: PtoStatus;
  page?: number;
  pageSize?: number;
  sort?: PtoSort;
  dir?: 'asc' | 'desc';
}

export type PtoCounts = Record<PtoStatus, number>;

export type PtoPage = Page<PtoRow> & { counts: PtoCounts };
