import type { Employee } from '@/src/core/domain/employee';
import type { ForecastTotals } from '@/src/core/domain/forecast-totals';
import type { EmployeeFilter, Page } from '@/src/core/domain/pagination';
import type { IEmployeeRepository, EmployeeUpdatePayload } from '@/src/core/ports/IEmployeeRepository';

import { createFetcher, type FetcherCtx } from './fetcher';
import { mapRawEmployee, mapRawForecastTotals } from './mappers';
import type { RawEmployee, RawForecastTotals, RawPage } from './types';

// Tope que acepta el backend en /api/employees (page_size: Query(25, ge=1, le=200))
const MAX_PAGE_SIZE = 200;

export class HttpEmployeeRepository implements IEmployeeRepository {
  private fetch: ReturnType<typeof createFetcher>;

  constructor(ctx: FetcherCtx) {
    this.fetch = createFetcher(ctx);
  }

  // Params de filtro compartidos por el listado y los totales
  private filterParams(filter: EmployeeFilter): URLSearchParams {
    const params = new URLSearchParams();
    if (filter.country) params.set('country', filter.country);
    if (filter.q) params.set('q', filter.q);
    if (filter.status) params.set('status', filter.status);
    if (filter.offering) params.set('offering', filter.offering);
    // El backend espera 'cl' (acepta varios niveles separados por coma)
    if (filter.level) params.set('cl', filter.level);
    if (filter.teApprover) params.set('te_approver', filter.teApprover);
    if (filter.chgBucket) params.set('chg_bucket', filter.chgBucket);
    return params;
  }

  async totals(filter: EmployeeFilter, windowOffset: number): Promise<ForecastTotals> {
    const params = this.filterParams(filter);
    params.set('window_offset', String(windowOffset));
    const raw = await this.fetch<RawForecastTotals>(`/api/employees/totals?${params}`);
    return mapRawForecastTotals(raw);
  }

  async list(filter: EmployeeFilter): Promise<Page<Employee>> {
    const params = this.filterParams(filter);
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

  // El backend no tiene un modo "sin paginar", asi que se pide la pagina mas grande que
  // acepta y, si el set no entro entero, se completan las que faltan. Hoy son 99 empleados
  // (una sola llamada); el bucle esta para que el dia que superen las 200 siga andando.
  async listAll(filter: EmployeeFilter): Promise<Page<Employee>> {
    const first = await this.list({ ...filter, page: 1, pageSize: MAX_PAGE_SIZE });
    const items = [...first.items];

    if (first.pages > 1) {
      const restPages = Array.from({ length: first.pages - 1 }, (_, i) => i + 2);
      const rest = await Promise.all(
        restPages.map((page) => this.list({ ...filter, page, pageSize: MAX_PAGE_SIZE })),
      );
      for (const p of rest) items.push(...p.items);
    }

    // Se respeta el contrato de Page<Employee>: queda una unica pagina con todo adentro
    return { items, total: first.total, page: 1, pageSize: items.length, pages: 1 };
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

  async assignRealEid(eid: string, newEid: string, newName?: string): Promise<{ ok: boolean; new_eid: string }> {
    const body: Record<string, string> = { new_eid: newEid };
    if (newName) body.new_name = newName;
    return this.fetch<{ ok: boolean; new_eid: string }>(`/api/employees/${eid}/assign-eid`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
}
