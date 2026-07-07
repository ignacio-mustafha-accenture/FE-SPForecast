import type { AppState, CountrySummary } from '@/src/core/domain/app-state';
import type { Country, Employee, ChargeabilityStatus } from '@/src/core/domain/employee';
import type { Period } from '@/src/core/domain/period';
import type { PPALog } from '@/src/core/domain/ppa';
import type { Ticket, TicketType } from '@/src/core/domain/ticket';
import type { User, Role } from '@/src/core/domain/user';
import { getEmployeeStatus } from '@/src/lib/status';

import type { RawAppState, RawEmployee, RawPeriod, RawPPALog, RawTicket, RawUser, RawTargets } from './types';

const COUNTRY_MAP: Record<string, Country> = {
  argentina: 'AR',
  'costa rica': 'CR',
  méxico: 'MX',
  mexico: 'MX',
};

function mapCountry(raw: string): Country {
  return COUNTRY_MAP[raw.toLowerCase()] ?? 'AR';
}

function normalizeKey(s: string): string {
  return s.toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u');
}

function buildCountryTargetMap(targets: RawTargets): Record<Country, number> {
  const general = targets.general ?? 87;
  const result: Record<Country, number> = { AR: general, MX: general, CR: general };
  const lookups: Record<string, Country> = {
    argentina: 'AR',
    mexico: 'MX',
    méxico: 'MX',
    'costa rica': 'CR',
  };
  for (const [key, value] of Object.entries(targets)) {
    if (key === 'general') continue;
    const code = lookups[normalizeKey(key)];
    if (code) result[code] = value;
  }
  return result;
}

export function mapRawEmployee(raw: RawEmployee, target = 87): Employee {
  const cp0 = raw.cp?.[0] ?? 0;
  const sah0 = raw.sah?.[0] ?? 0;
  const chg0 = raw.chg?.[0] ?? 0;
  const hasClient = raw.Charge !== false;
  const isTerminated = !!raw.TerminationDate;

  return {
    id: raw.EID,
    name: raw.Name,
    email: '',
    country: mapCountry(raw.Country),
    level: raw.CL ?? '',
    project: raw.Client || null,
    client: raw.Client || null,
    projectType: raw.ProjectType || null,
    manager: raw.Manager || null,
    rollOn: raw.RollOn || null,
    rollOff: raw.RollOff || null,
    fad: raw.FAD || null,
    daysToAvailable: raw.DaysToAvailable ?? 0,
    hireDate: raw.HireDate || null,
    nextPTO: raw.NextPTO || null,
    nextPTOHours: raw.NextPTOHours ?? null,
    newJoiner: raw.NewJoiner ?? false,
    charge: hasClient,
    chg: raw.chg ?? [],
    sah: raw.sah ?? [],
    cp: raw.cp ?? [],
    chargeabilityStatus: getEmployeeStatus(cp0, target, hasClient, isTerminated),
    chargeabilityPercent: cp0 / 100,
    availableHours: Math.max(0, sah0 - chg0),
    totalHours: sah0,
    notes: raw.Notes ?? '',
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
  const eidCountry = raw.eid_country ? mapCountry(raw.eid_country) : undefined;
  return {
    id: raw.id,
    employeeId: raw.eid,
    employeeName: raw.eid_name ?? employee?.name ?? raw.by ?? raw.eid,
    country: eidCountry ?? employee?.country ?? '',
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
  const rawCountry = raw.country ? mapCountry(raw.country) : undefined;
  return {
    id: raw.id,
    employeeId: raw.eid,
    employeeName: raw.name,
    country: rawCountry ?? employee?.country ?? '',
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
    unassignedCount: emps.filter((e) => e.chargeabilityStatus === 'unassigned').length,
    leaveCount: emps.filter((e) => e.chargeabilityStatus === 'leave').length,
    avgChargeability:
      emps.length > 0
        ? emps.reduce((acc, e) => acc + e.chargeabilityPercent, 0) / emps.length
        : 0,
    availableHours: emps.reduce((acc, e) => acc + e.availableHours, 0),
  }));
}

export function mapRawAppState(raw: RawAppState, windowOffset: number): AppState {
  const currentPeriod = raw.periods?.find((p) => p.isCurrent) ?? raw.periods?.[0];
  const allPeriods = (raw.periods ?? []).map((p) => mapRawPeriod(p, windowOffset));
  const countryTargets = buildCountryTargetMap(raw.targets ?? { general: 87 });
  const employees = (raw.employees ?? []).map((e) => mapRawEmployee(e, countryTargets[mapCountry(e.Country) ?? 'AR']));
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  return {
    period: currentPeriod ? mapRawPeriod(currentPeriod, windowOffset) : { label: '—', startDate: '', endDate: '', windowOffset },
    periods: allPeriods,
    employees,
    tickets: (raw.tickets ?? []).map((t) => mapRawTicket(t, employeeMap)),
    ppaLogs: (raw.ppa_log ?? []).map((p) => mapRawPPALog(p, employeeMap)),
    countrySummaries: computeCountrySummaries(employees),
    targets: raw.targets ?? { general: 87 },
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
