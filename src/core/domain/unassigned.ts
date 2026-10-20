import type { Page } from './pagination';

export type UnassignedGroup = 'unassigned' | 'mes_actual' | 'mes1' | 'mes2';

export const UNASSIGNED_GROUPS: UnassignedGroup[] = ['unassigned', 'mes_actual', 'mes1', 'mes2'];

export type UnassignedSort = 'name' | 'country' | 'level' | 'client' | 'roll_off' | 'days';

export interface UnassignedRow {
  id: string;
  name: string;
  country: string;
  level: string;
  client: string | null;
  manager: string | null;
  rollOff: string | null;
  fad: string | null;
  daysToAvailable: number | null;
  /** Días desde el roll off (desasignados) o días restantes (resto). */
  days: number | null;
  group: UnassignedGroup;
}

export interface UnassignedFilter {
  country?: string;
  offering?: string;
  level?: string;
  q?: string;
  group?: UnassignedGroup;
  page?: number;
  pageSize?: number;
  sort?: UnassignedSort;
  dir?: 'asc' | 'desc';
}

export type UnassignedCounts = Record<UnassignedGroup, number>;

export type UnassignedPage = Page<UnassignedRow> & { counts: UnassignedCounts };
