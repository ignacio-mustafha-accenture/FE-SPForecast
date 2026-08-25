import type { CalendarPeriod } from '@/src/core/domain/period';

export interface IPeriodRepository {
  listAll(): Promise<CalendarPeriod[]>;
}
