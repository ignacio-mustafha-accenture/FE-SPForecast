import type { AppState, CountrySummary } from '@/src/core/domain/app-state';
import type { Country, Employee, ChargeabilityStatus } from '@/src/core/domain/employee';
import type { Period } from '@/src/core/domain/period';
import type { PPALog } from '@/src/core/domain/ppa';
import type { Ticket, TicketType } from '@/src/core/domain/ticket';
import type { User, Role } from '@/src/core/domain/user';

import type { RawAppState, RawEmployee, RawPeriod, RawPPALog, RawTicket, RawUser } from './types';

const COUNTRY_MAP: Record<string, Country> = {
  argentina: 'AR',
  'costa rica': 'CR',
  méxico: 'MX',
  mexico: 'MX',
};

function mapCountry(raw: string): Country {
  return COUNTRY_MAP[raw.toLowerCase()] ?? 'AR';
}

function mapChargeabilityStatus(cp0: number, charge: boolean): ChargeabilityStatus {
  if (!charge) return 'unassigned';
  if (cp0 >= 80) return 'green';
  if (cp0 >= 50) return 'yellow';
  return 'red';
}

export function mapRawEmployee(raw: RawEmployee): Employee {
  const cp0 = raw.cp?.[0] ?? 0;
  const sah0 = raw.sah?.[0] ?? 0;
  const chg0 = raw.chg?.[0] ?? 0;

  return {
    id: raw.EID,
    name: raw.Name,
    email: '',
    country: mapCountry(raw.Country),
    level: raw.CL,
    project: raw.Client || raw.ProjectType || null,
    chargeabilityStatus: mapChargeabilityStatus(cp0, raw.Charge),
    chargeabilityPercent: cp0 / 100,
    availableHours: Math.max(0, sah0 - chg0),
    totalHours: sah0,
    notes: '',
  };
}

export function mapRawPeriod(raw: RawPeriod, windowOffset: number): Period {
  return {
    label: raw.label ?? raw.period_name,
    startDate: raw.start_date,
    endDate: raw.end_date,
    windowOffset,
  };
}

export function mapRawTicket(raw: RawTicket, employeeMap: Map<string, Employee>): Ticket {
  const employee = employeeMap.get(raw.eid);
  return {
    id: raw.id,
    employeeId: raw.eid,
    employeeName: employee?.name ?? raw.by ?? raw.eid,
    country: employee?.country ?? '',
    type: raw.type as TicketType,
    detail: raw.detail,
    status: raw.status,
    date: raw.date,
    by: raw.by,
    clientName: raw.client_name,
    offeringType: raw.offering_type,
    chargeabilityPct: raw.chargeability_pct,
    hoursToMove: raw.hours_to_move,
    fromPeriod: raw.from_period,
    toPeriod: raw.to_period,
    comments: raw.comments,
  };
}

export function mapRawPPALog(raw: RawPPALog, employeeMap: Map<string, Employee>): PPALog {
  const employee = employeeMap.get(raw.eid);
  return {
    id: raw.id,
    employeeId: raw.eid,
    employeeName: raw.name,
    country: employee?.country ?? '',
    fromPeriod: raw.from,
    toPeriod: raw.to,
    hours: raw.hs,
    reason: raw.reason,
    appliedAt: raw.date,
  };
}

function computeCountrySummaries(employees: Employee[]): CountrySummary[] {
  const byCountry = new Map<string, Employee[]>();
  for (const e of employees) {
    const list = byCountry.get(e.country) ?? [];
    list.push(e);
    byCountry.set(e.country, list);
  }

  return Array.from(byCountry.entries()).map(([country, emps]) => ({
    country,
    totalEmployees: emps.length,
    chargeableCount: emps.filter((e) => e.chargeabilityStatus === 'green').length,
    atRiskCount: emps.filter((e) => e.chargeabilityStatus === 'yellow').length,
    unchargeableCount: emps.filter((e) => e.chargeabilityStatus === 'red').length,
    avgChargeability:
      emps.length > 0
        ? emps.reduce((acc, e) => acc + e.chargeabilityPercent, 0) / emps.length
        : 0,
    availableHours: emps.reduce((acc, e) => acc + e.availableHours, 0),
  }));
}

export function mapRawAppState(raw: RawAppState, windowOffset: number): AppState {
  const currentPeriod = raw.periods?.find((p) => p.isCurrent) ?? raw.periods?.[0];

  const employees = (raw.employees ?? []).map(mapRawEmployee);
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  return {
    period: currentPeriod ? mapRawPeriod(currentPeriod, windowOffset) : { label: '—', startDate: '', endDate: '', windowOffset },
    employees,
    tickets: (raw.tickets ?? []).map((t) => mapRawTicket(t, employeeMap)),
    ppaLogs: (raw.ppa_log ?? []).map((p) => mapRawPPALog(p, employeeMap)),
    countrySummaries: computeCountrySummaries(employees),
    lastSyncAt: null,
    lastRecalcAt: null,
  };
}

export function mapRawUser(raw: RawUser): User {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.full_name,
    role: raw.role as Role,
    country: null,
  };
}
