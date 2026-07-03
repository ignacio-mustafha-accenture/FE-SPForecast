import type { Employee } from '@/src/core/domain/employee';
import type { IEmployeeRepository } from '@/src/core/ports/IEmployeeRepository';

import { createFetcher, type FetcherCtx } from './fetcher';

export class HttpEmployeeRepository implements IEmployeeRepository {
  private fetch: ReturnType<typeof createFetcher>;

  constructor(ctx: FetcherCtx) {
    this.fetch = createFetcher(ctx);
  }

  async update(id: string, data: Partial<Pick<Employee, 'notes' | 'project'>>): Promise<Employee> {
    return this.fetch<Employee>(`/api/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}
