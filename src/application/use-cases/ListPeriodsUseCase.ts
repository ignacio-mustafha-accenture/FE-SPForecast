import type { CalendarPeriod } from '@/src/core/domain/period';
import type { IPeriodRepository } from '@/src/core/ports/IPeriodRepository';

export class ListPeriodsUseCase {
  constructor(private repo: IPeriodRepository) {}

  execute(): Promise<CalendarPeriod[]> {
    return this.repo.listAll();
  }
}
