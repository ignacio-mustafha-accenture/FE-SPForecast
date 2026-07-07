import type { Employee } from '@/src/core/domain/employee';
import type { EmployeeFilter, Page } from '@/src/core/domain/pagination';
import type { IEmployeeRepository, EmployeeUpdatePayload } from '@/src/core/ports/IEmployeeRepository';

import { createFetcher, type FetcherCtx } from './fetcher';
import { mapRawEmployee } from './mappers';
import type { RawEmployee, RawPage } from './types';

export class HttpEmployeeRepository implements IEmployeeRepository {
  private fetch: ReturnType<typeof createFetcher>;

  constructor(ctx: FetcherCtx) {
    this.fetch = createFetcher(ctx);
  }

  async list(filter: EmployeeFilter): Promise<Page<Employee>> {
    const params = new URLSearchParams();
    if (filter.country) params.set('country', filter.country);
    if (filter.q) params.set('q', filter.q);
    if (filter.status) params.set('status', filter.status);
    params.set('page', String(filter.page ?? 1));
    params.set('page_size', String(filter.pageSize ?? 10));
    const raw = await this.fetch<RawPage<RawEmployee>>(`/api/employees?${params}`);
    return {
      items: raw.items.map((e) => mapRawEmployee(e)),
      total: raw.total,
      page: raw.page,
      pageSize: raw.page_size,
      pages: raw.pages,
    };
  }

  async update(id: string, data: EmployeeUpdatePayload): Promise<void> {
    const body: Record<string, unknown> = {};
    if (data.newEid !== undefined) body.new_eid = data.newEid;
    if (data.name !== undefined) body.name = data.name;
    if (data.cl !== undefined) body.cl = data.cl;
    if (data.client !== undefined) body.client = data.client;
    if (data.offering !== undefined) body.offering = data.offering;
    if (data.rollOn !== undefined) body.roll_on = data.rollOn;
    if (data.rollOff !== undefined) body.roll_off = data.rollOff;
    if (data.accountManager !== undefined) body.account_manager = data.accountManager;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.nextClient !== undefined) body.next_client = data.nextClient;
    if (data.chargeabilityPct !== undefined) body.chargeability_pct = data.chargeabilityPct;
    await this.fetch<void>(`/api/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async getById(id: string): Promise<Employee> {
    const raw = await this.fetch<RawEmployee>(`/api/employees/${id}`);
    return mapRawEmployee(raw);
  }
}
