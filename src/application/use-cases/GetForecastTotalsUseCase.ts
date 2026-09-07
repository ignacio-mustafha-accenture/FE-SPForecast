import type { ForecastTotals } from '@/src/core/domain/forecast-totals';
import type { EmployeeFilter } from '@/src/core/domain/pagination';
import type { IEmployeeRepository } from '@/src/core/ports/IEmployeeRepository';

export class GetForecastTotalsUseCase {
  constructor(private repo: IEmployeeRepository) {}

  execute(filter: EmployeeFilter, windowOffset: number): Promise<ForecastTotals> {
    return this.repo.totals(filter, windowOffset);
  }
}
