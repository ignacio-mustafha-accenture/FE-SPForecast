'use client';

import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from 'react';
import { useToast } from '@/src/hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, PencilLine, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Employee } from '@/src/core/domain/employee';
import type { ForecastTotals, TotalPeriodValues } from '@/src/core/domain/forecast-totals';
import type { Ticket } from '@/src/core/domain/ticket';
import type { Period } from '@/src/core/domain/period';
import type { Page } from '@/src/core/domain/pagination';
import { HttpChargeabilityBlockRepository } from '@/src/adapters/http/HttpChargeabilityBlockRepository';
import { getClientContainer } from '@/src/application/container';
import { useForecastStore, useAuthStore } from '@/src/store/StoreProvider';
import { useWindowOffset } from '@/src/hooks/useWindowOffset';
import { useDebounce } from '@/src/hooks/useDebounce';
import { FilterBar } from '@/src/components/ui/FilterBar';
import { Modal } from '@/src/components/ui/Modal';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { exportToXlsx } from '@/src/lib/excel';
import { parseDDMMYY, formatDate } from '@/src/lib/formatters';

const blockRepo = new HttpChargeabilityBlockRepository();

const NO_PERIODS: Period[] = [];
const NO_EMPLOYEES: Employee[] = [];
const NO_TICKETS: Ticket[] = [];

const TBODY_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
};

const ROW_VARIANTS = {
  hidden: { opacity: 0, y: -7 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

const DAY_W = 40;
const SUMMARY_W = 60;

// Anchos de la tabla de empleados. A 1440px de ancho quedan ~1149px utiles
// (1440 - sidebar 228 - padding 48 - barra de scroll ~15), asi que las 21 columnas
// tienen que sumar menos que eso para no obligar a scrollear en horizontal.
const EMP_NAME_W = 172;
const EMP_D2A_W = 42;
const EMP_ROLL_W = 56;
const EMP_CHG_W = 46;
const EMP_SAH_W = 42;
const EMP_PCT_W = 46;
const EMP_PERIOD_W = EMP_CHG_W + EMP_SAH_W + EMP_PCT_W;
const EMP_FIXED_W = EMP_NAME_W + EMP_D2A_W + EMP_ROLL_W * 2;

// Anchos del bloque de totales. Al ser una tabla aparte no necesita alinearse con la de
// empleados, asi que se reparte el mismo ancho entre menos columnas y con mas aire.
const TOT_LABEL_W = 180;
const TOT_HC_W = 56;
const TOT_CHG_W = 50;
const TOT_SAH_W = 42;
const TOT_PCT_W = 58;
const TOT_PERIOD_W = TOT_CHG_W + TOT_SAH_W + TOT_PCT_W;

// Separacion vertical entre el bloque de totales y la tabla (el space-y-3 del contenedor).
// Se usa para anclar el header de columnas justo debajo del bloque cuando esta pegado arriba.
const STICKY_GAP = 12;

const DOW_ES = ['dom', 'lun', 'mar', 'miÃ©', 'jue', 'vie', 'sÃ¡b'];

const AVATAR_PALETTE = [
  '#7c5cff', '#0ea5b5', '#12a86f', '#e0872a', '#e05c8a', '#5c9ae0', '#c05cc0',
];

const TYPE_LABELS: Record<string, string> = {
  newproj: 'Nuevo proyecto',
  ongoing: 'En curso',
  pto: 'Vacaciones',
  sick: 'Enfermedad',
  nj: 'No joineo',
  baja: 'Baja',
};

const STATUS_LABELS: Record<string, string> = {
  Open: 'Abierto',
  Approved: 'Aprobado',
  Rejected: 'Rechazado',
};

const typeVariant: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'neutral' | 'purple'> = {
  newproj: 'green',
  ongoing: 'blue',
  pto: 'yellow',
  sick: 'yellow',
  nj: 'red',
  baja: 'red',
};

const statusVariant: Record<string, 'yellow' | 'green' | 'red' | 'neutral'> = {
  Open: 'yellow',
  Approved: 'green',
  Rejected: 'red',
};

// Colores por subtipo de assumption, segun la leyenda del Excel
// (hoja 'Forecast Update', celdas B93:B96)
const ASSUMPTION_CELL: Record<string, { bg: string; fg: string; label: string }> = {
  isg_assessment: { bg: '#fff2cc', fg: '#9c5700', label: 'Assumption ISG Assessment' },
  no_r:           { bg: '#ffcccc', fg: '#c00000', label: 'Assumption No R' },
  r:              { bg: '#dbe5f1', fg: '#1f4e79', label: 'Assumption R' },
};

function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Roll-on / Roll-off llegan del backend ya formateados como DD/MM/YY (TO_CHAR en SQL).
// Si alguna fuente los entrega en ISO (YYYY-MM-DD) los normalizamos con formatDate.
function formatRollDate(value: string | null): string {
  if (!value) return '—';
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? formatDate(value) : value;
}

function getBarStyle(emp: Employee, isHL: boolean): React.CSSProperties {
  if (isHL) return { background: '#e8effc', color: '#2f5bb7', border: '1.5px solid #5b8def' };
  if (emp.client === 'ISG PE Assessment') return { background: '#fef9c3', color: '#854d0e', border: '1.5px dashed #eab308' };
  if (emp.newJoiner) return { background: '#f8fafc', color: '#64748b', border: '1.5px dashed #94a3b8' };
  if (emp.isgAligned && emp.ringfenced) return { background: '#fff7ed', color: '#9a3412', border: '1.5px dashed #f97316' };
  return { background: '#fef2f2', color: '#991b1b', border: '1.5px dashed #f87171' };
}

type AssumptionKind = 'effective' | 'isgAssessment' | 'newJoiner' | 'isgRingfenced' | 'noIsg';

function assumptionKind(emp: Employee): AssumptionKind {
  // ISG Ringfenced es un atributo a nivel PERSONA: manda sobre el resto
  if (emp.isgAligned && emp.ringfenced) return 'isgRingfenced';
  if (emp.scenarioType === 'effective') return 'effective';
  if (emp.client === 'ISG PE Assessment') return 'isgAssessment';
  if (emp.newJoiner) return 'newJoiner';
  return 'noIsg';
}

const ROW_TONE: Record<AssumptionKind, string> = {
  effective:     'bg-white',
  isgAssessment: 'bg-[#fefce8]',
  newJoiner:     'bg-[#f8fafc]',
  isgRingfenced: 'bg-[#e0f2fe]',
  noIsg:         'bg-[#fef2f2]',
};

interface DayCell {
  idx: number;
  date: Date;
  num: number;
  dow: number;
  weekend: boolean;
}

interface DayGroup {
  key: string;
  label: string;
  count: number;
}

type SortField = 'name' | 'days2avail' | 'chgPct' | null;
type SortDir = 'asc' | 'desc';

// Horas y porcentajes se muestran enteros. Los decimales que traia el backend venian de
// repartir horas entre dias y no aportaban precision real, solo ruido al leer la grilla.
function fmtHours(v: number): string {
  return String(Math.round(v));
}

// El CHG que suman los totales tiene que ser el del modo activo del toggle, igual que las
// celdas de los empleados. El backend devuelve las tres sumas y aca se elige la que aplica.
function chgForMode(t: TotalPeriodValues, mode: 'HL' | 'SL' | 'NETO'): number {
  if (mode === 'HL') return t.chgHl;
  if (mode === 'SL') return t.chgSl;
  return t.chgNeto;
}

function cellsInRange(from: Date, to: Date): DayCell[] {
  const cells: DayCell[] = [];
  const cur = startOfDay(new Date(from));
  const end = startOfDay(new Date(to));
  let i = 0;
  while (cur <= end) {
    cells.push({ idx: i, date: new Date(cur), num: cur.getDate(), dow: cur.getDay(), weekend: cur.getDay() === 0 || cur.getDay() === 6 });
    cur.setDate(cur.getDate() + 1);
    i++;
  }
  return cells;
}

export function AllView() {
  const t = useTranslations('all');
  const toast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const periods = useForecastStore((s) => s.appState?.periods ?? NO_PERIODS);
  const storeEmps = useForecastStore((s) => s.appState?.employees ?? NO_EMPLOYEES);
  const allTickets = useForecastStore((s) => s.appState?.tickets ?? NO_TICKETS);
  const fetchState = useForecastStore((s) => s.fetchState);
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const { offset: windowOffset } = useWindowOffset();

  const storeEmpMap = useMemo(
    () => new Map(storeEmps.map((e) => [e.id, e])),
    [storeEmps],
  );

  const employeeIdsWithTickets = useMemo(
    () => new Set(allTickets.map((t) => t.employeeId)),
    [allTickets],
  );

  const sickRangesMap = useMemo(() => {
    const map = new Map<string, { start: Date; end: Date }[]>();
    for (const t of allTickets) {
      if (t.type !== 'sick' || t.status !== 'Approved' || !t.startDate || !t.endDate || !t.employeeId) continue;
      const ranges = map.get(t.employeeId) ?? [];
      ranges.push({ start: parseLocalDate(t.startDate), end: parseLocalDate(t.endDate) });
      map.set(t.employeeId, ranges);
    }
    return map;
  }, [allTickets]);

  const [result, setResult] = useState<Page<Employee> | null>(null);
  const [totals, setTotals] = useState<ForecastTotals | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [effectivizeTarget, setEffectivizeTarget] = useState<{ eid: string; name: string } | null>(null);
  const [chgModal, setChgModal] = useState<{ emp: Employee; tickets: Ticket[] } | null>(null);
  const [effectivizePct, setEffectivizePct] = useState('');
  const [isEffectivizing, setIsEffectivizing] = useState(false);
  const [effectivizeError, setEffectivizeError] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(0);
  const [rangeAnchor, setRangeAnchor] = useState<number | null>(null);
  const [holidays, setHolidays] = useState<Map<string, Map<string, string>>>(new Map());

  // Sort state
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const q = searchParams.get('q') ?? '';
  const country = searchParams.get('country') ?? '';
  const status = searchParams.get('status') ?? '';
  const offering = searchParams.get('offering') ?? '';
  const level = searchParams.get('level') ?? '';
  const teApprover = searchParams.get('te_approver') ?? '';
  const chgBucket = searchParams.get('chg_bucket') ?? '';
  const chgParam = searchParams.get('chg');
  // Bug 9: default CHG Neto al ingresar (antes defaulteaba a HL)
  const chgType = (chgParam === 'HL' ? 'HL' : chgParam === 'SL' ? 'SL' : 'NETO') as 'HL' | 'SL' | 'NETO';

  const [teApprovers, setTeApprovers] = useState<string[]>([]);
  const [teApproverSearch, setTeApproverSearch] = useState('');
  const [showTeApproverDrop, setShowTeApproverDrop] = useState(false);

  const [localQ, setLocalQ] = useState(q);
  const didMount = useRef(false);

  useEffect(() => { setLocalQ(q); }, [q]);

  const debouncedQ = useDebounce(localQ, 300);

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    const p = new URLSearchParams(searchParams.toString());
    debouncedQ ? p.set('q', debouncedQ) : p.delete('q');
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [debouncedQ]);

  useEffect(() => {
    fetch('/api/te-approvers', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setTeApprovers(d.items ?? []))
      .catch(() => {});
  }, []);

  // La vista no pagina: se trae todo el set filtrado de una, para que los totales de arriba
  // y la tabla de abajo hablen siempre de la misma poblacion.
  useEffect(() => {
    let cancelled = false;
    setIsFetching(true);
    getClientContainer()
      .listAllEmployees.execute({
        country: country || undefined,
        q: debouncedQ || undefined,
        status: status || undefined,
        offering: offering || undefined,
        level: level || undefined,
        teApprover: teApprover || undefined,
        chgBucket: chgBucket || undefined,
      })
      .then((data) => { if (!cancelled) setResult(data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) { setIsFetching(false); setIsRefetching(false); } });
    return () => { cancelled = true; };
  }, [country, debouncedQ, status, offering, level, teApprover, chgBucket, refreshKey]);

  // Totales agregados sobre TODO el set filtrado (el backend ignora el paginado).
  // Se piden con los mismos filtros que el listado y con el window_offset de la ventana
  // de periodos, para que las columnas coincidan con las de la tabla.
  useEffect(() => {
    let cancelled = false;
    getClientContainer()
      .getForecastTotals.execute(
        {
          country: country || undefined,
          q: debouncedQ || undefined,
          status: status || undefined,
          offering: offering || undefined,
          level: level || undefined,
          teApprover: teApprover || undefined,
          chgBucket: chgBucket || undefined,
        },
        windowOffset,
      )
      .then((data) => { if (!cancelled) setTotals(data); })
      .catch((err) => {
        // Un fallo aca no puede romper la tabla: se descartan los totales y se sigue
        console.warn('[AllView] no se pudieron obtener los totales:', err);
        if (!cancelled) setTotals(null);
      });
    return () => { cancelled = true; };
  }, [country, debouncedQ, status, offering, level, teApprover, chgBucket, windowOffset, refreshKey]);

  // Las columnas de periodo salen del appState que hidrata el layout server-side con
  // /api/state. Si esa llamada falla durante el render del layout, el store queda sin
  // periodos y la tabla se queda sin columnas hasta que el usuario recargue a mano.
  // Este reintento unico en el cliente hace que ese fallo puntual no deje la tabla vacia.
  const didRetryState = useRef(false);
  useEffect(() => {
    if (periods.length > 0 || didRetryState.current) return;
    didRetryState.current = true;
    fetchState(windowOffset);
  }, [periods.length, fetchState, windowOffset]);

  useEffect(() => {
    const countries = ['AR', 'MX', 'CR'];
    Promise.all(
      countries.map((c) =>
        fetch(`/api/admin/holidays?country=${c}`)
          .then((r) => r.ok ? r.json() : { holidays: [] })
          .then((data) => [c, data.holidays] as const)
      )
    ).then((results) => {
      const map = new Map<string, Map<string, string>>();
      for (const [c, list] of results) {
        const inner = new Map<string, string>();
        for (const h of list) inner.set(h.date, h.name);
        map.set(c, inner);
      }
      setHolidays(map);
    });
  }, []);

  const [windowAnchor, setWindowAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'daily' | 'forecast'>('forecast');

  const getPeriodIdx = useCallback(
    (date: Date): number => {
      for (let i = 0; i < periods.length; i++) {
        if (date >= startOfDay(parseLocalDate(periods[i].startDate)) && date <= endOfDay(parseLocalDate(periods[i].endDate))) return i;
      }
      return -1;
    },
    [periods],
  );

  const { days, dayGroups, windowStart, windowEnd, toolbarLabel, canPrev, canNext, currentPIdx } = useMemo(() => {
    const today = startOfDay(new Date());

    if (periods.length === 0) {
      const cells = cellsInRange(today, new Date(today.getTime() + 13 * 86_400_000));
      return {
        days: cells,
        dayGroups: [{ key: 'loading', label: '...', count: cells.length }],
        windowStart: today,
        windowEnd: endOfDay(cells[cells.length - 1].date),
        toolbarLabel: '-',
        canPrev: false,
        canNext: false,
        currentPIdx: 0,
      };
    }

    const pIdx = getPeriodIdx(windowAnchor);
    const safePIdx = pIdx >= 0 ? pIdx : 0;
    const p = periods[safePIdx];
    const cells = cellsInRange(parseLocalDate(p.startDate), parseLocalDate(p.endDate));
    const wStart = startOfDay(parseLocalDate(p.startDate));
    const wEnd = endOfDay(parseLocalDate(p.endDate));

    const first = cells[0];
    const last = cells[cells.length - 1];
    const fmt = (d: Date) => d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    const label = `${p.label} - ${fmt(first.date)} a ${fmt(last.date)}`;

    return {
      days: cells,
      dayGroups: [{ key: p.label, label: p.label, count: cells.length }],
      windowStart: wStart,
      windowEnd: wEnd,
      toolbarLabel: label,
      canPrev: safePIdx > 0,
      canNext: safePIdx < periods.length - 1,
      currentPIdx: safePIdx,
    };
  }, [windowAnchor, periods, getPeriodIdx]);

  const nDays = days.length;
  const colW = DAY_W;

    function navigate(dir: number) {
    const pIdx = getPeriodIdx(windowAnchor);
    const safePIdx = pIdx >= 0 ? pIdx : 0;
    const targetIdx = safePIdx + dir;
    if (targetIdx < 0 || targetIdx > periods.length - 1) {
      fetchState(windowOffset + dir);
      return;
    }

    setWindowAnchor(startOfDay(parseLocalDate(periods[targetIdx].startDate)));
  }

  const activeCountries = useMemo(() => (country ? country.split(',') : []), [country]);

  const paged = useMemo(() => {
    const items = result?.items ?? [];
    const enriched = items.map((e) => {
      const s = storeEmpMap.get(e.id);
      if (!s) return e;
      return {
        ...e,
        cp: s.cp.length > 0 ? s.cp : e.cp,
        slAssumed: s.slAssumed.length > 0 ? s.slAssumed : e.slAssumed,
        hl: s.hl.length > 0 ? s.hl : e.hl,
        chg: s.chg.length > 0 ? s.chg : e.chg,
        sah: s.sah.length > 0 ? s.sah : e.sah,
        chgEffective: s.chgEffective.length > 0 ? s.chgEffective : e.chgEffective,
        chgAssumption: s.chgAssumption.length > 0 ? s.chgAssumption : e.chgAssumption,
        ppaAdj: s.ppaAdj.length > 0 ? s.ppaAdj : e.ppaAdj,
        slReal: s.slReal.length > 0 ? s.slReal : e.slReal,
        chgNeto: s.chgNeto ?? e.chgNeto,
        chgHl: s.chgHl ?? e.chgHl,
        chgSl: s.chgSl ?? e.chgSl,
        chgPctHl: s.chgPctHl ?? e.chgPctHl,
        chgPctSl: s.chgPctSl ?? e.chgPctSl,
        assumptionKind: s.assumptionKind ?? e.assumptionKind,
      };
    });
    return enriched;
  }, [result?.items, storeEmpMap]);

  // DÃ­as hasta roll off (Days to Availability) por empleado
  const days2AvailMap = useMemo(() => {
    const today = startOfDay(new Date());
    const map = new Map<string, number>();
    for (const emp of paged) {
      const rollOff = parseDDMMYY(emp.rollOff);
      if (!rollOff) { map.set(emp.id, 0); continue; }
      const diff = Math.ceil((rollOff.getTime() - today.getTime()) / 86_400_000);
      map.set(emp.id, diff);
    }
    return map;
  }, [paged]);

  const sinDatos = useCallback((e: Employee) => !e.rollOff, []);

  const sortedPaged = useMemo(() => {
    const conDatos: Employee[] = [];
    const vacios: Employee[] = [];
    for (const e of paged) (sinDatos(e) ? vacios : conDatos).push(e);

    if (!sortField) return [...conDatos, ...vacios];

    const comparar = (a: Employee, b: Employee) => {
      let va = 0, vb = 0;
      if (sortField === 'name') {
        const cmp = a.name.localeCompare(b.name);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'days2avail') {
        va = days2AvailMap.get(a.id) ?? 0;
        vb = days2AvailMap.get(b.id) ?? 0;
      }
      if (sortField === 'chgPct') {
        const pctOf = (x: Employee) => {
          if (chgType === 'HL') return x.cp[currentPIdx] ?? 0;
          if (chgType === 'SL') return x.slAssumed[currentPIdx] ?? 0;
          const sahX = x.sah[currentPIdx] ?? 0;
          return sahX > 0 ? ((x.chgNeto?.[currentPIdx] ?? 0) / sahX) * 100 : 0;
        };
        va = pctOf(a);
        vb = pctOf(b);
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    };

    return [...conDatos.sort(comparar), ...vacios.sort(comparar)];
  }, [paged, sortField, sortDir, days2AvailMap, chgType, currentPIdx, sinDatos]);





  // Las filas de totales son un extra: solo se muestran si el endpoint respondio y hay
  // empleados en la tabla. Nunca condicionan el render de las columnas de periodo.
  // Se ocultan las filas sin gente: hoy Mexico y Costa Rica vienen en 0 y solo
  // agregan ruido. El filtro es por dato, asi que si manana entra alguien la fila
  // reaparece sola sin tocar codigo.
  const totalRows = useMemo(
    () => ((result?.total ?? 0) > 0 ? (totals?.rows ?? []).filter((r) => r.hc > 0) : []),
    [result?.total, totals],
  );

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={10} className="opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />;
  }

  // El bloque de totales y el header de columnas quedan pegados arriba mientras se scrollea
  // la pagina. El alto del bloque de totales depende de cuantas filas tengan datos, asi que
  // se mide en runtime para poder anclar el header justo debajo en vez de hardcodear un alto.
  const totalsBlockRef = useRef<HTMLDivElement | null>(null);
  const headRowRef = useRef<HTMLTableRowElement | null>(null);
  const [totalsBlockH, setTotalsBlockH] = useState(0);
  const [headRowH, setHeadRowH] = useState(0);
  // El bloque de totales se puede colapsar para recuperar alto de pantalla al recorrer la
  // lista de empleados. Al colapsar cambia el alto del bloque, y el ResizeObserver de arriba
  // reancla el header de la tabla solo, sin recalcular nada a mano.
  const [totalsOpen, setTotalsOpen] = useState(true);

  useEffect(() => {
    const measured: [HTMLElement | null, (h: number) => void][] = [
      [totalsBlockRef.current, setTotalsBlockH],
      [headRowRef.current, setHeadRowH],
    ];
    const observers = measured.map(([el, setH]) => {
      if (!el) { setH(0); return null; }
      setH(el.offsetHeight);
      const ro = new ResizeObserver(() => setH(el.offsetHeight));
      ro.observe(el);
      return ro;
    });
    return () => { for (const ro of observers) ro?.disconnect(); };
  }, [viewMode, totalRows.length, periods.length]);

  const totalsOffset = totalsBlockH > 0 ? totalsBlockH + STICKY_GAP : 0;
  const headTop = `calc(var(--topbar-h) + ${totalsOffset}px)`;
  const headSubTop = `calc(var(--topbar-h) + ${totalsOffset + headRowH}px)`;

  const isHoliday = (date: Date, empCountry: string): string | null => {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidays.get(empCountry)?.get(iso) ?? null;
  };

  function openEffectivizeModal(emp: Employee) {
    const firstIdx = emp.slAssumed.findIndex((v) => (v ?? 0) > 0);
    const safeStart = firstIdx >= 0 ? firstIdx : 0;

    let safeEnd = safeStart;
    for (let i = safeStart + 1; i < emp.slAssumed.length; i++) {
      if ((emp.slAssumed[i] ?? 0) > 0) safeEnd = i;
      else break;
    }

    const slPct = emp.slAssumed[safeStart] ?? 0;

    setEffectivizeTarget({ eid: emp.id, name: emp.name });
    setRangeStart(safeStart);
    setRangeEnd(safeEnd);
    setRangeAnchor(null);
    setEffectivizePct(String(slPct > 0 ? slPct : (emp.cp[safeStart] ?? 100)));
    setEffectivizeError(null);
  }

  function closeEffectivizeModal() {
    if (isEffectivizing) return;
    setEffectivizeTarget(null);
    setEffectivizeError(null);
  }

  function handlePeriodChipClick(idx: number) {
    const emp = result?.items.find((e) => e.id === effectivizeTarget?.eid);
    const slAt = (i: number) => {
      const v = emp?.slAssumed[i] ?? 0;
      return v > 0 ? v : (emp?.cp[i] ?? 100);
    };
    if (rangeAnchor !== null) {
      const newStart = Math.min(rangeAnchor, idx);
      const newEnd = Math.max(rangeAnchor, idx);
      setRangeStart(newStart);
      setRangeEnd(newEnd);
      setRangeAnchor(null);
      setEffectivizePct(String(slAt(newStart)));
    } else {
      setRangeAnchor(idx);
      setRangeStart(idx);
      setRangeEnd(idx);
      setEffectivizePct(String(slAt(idx)));
    }
  }

  async function handleEffectivize() {
    if (!effectivizeTarget) return;
    const pct = parseFloat(effectivizePct);
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    const selectedPeriodNames = periods
      .filter((_, i) => i >= rangeStart && i <= rangeEnd)
      .map((p) => p.label);
    setIsEffectivizing(true);
    setEffectivizeError(null);
    try {
      const efResult = await blockRepo.effectivize(effectivizeTarget.eid, selectedPeriodNames, pct);
      if (efResult.updated === 0) {
        toast.info(t('effectivizeNoop'));
      } else {
        toast.success(t('effectivizeSuccess'));
      }
      setIsRefetching(true);
      setEffectivizeTarget(null);
      await fetchState(windowOffset);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('effectivizeError');
      setEffectivizeError(msg);
      toast.error(msg);
      setIsRefetching(false);
    } finally {
      setIsEffectivizing(false);
    }
  }

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    value ? p.set(key, value) : p.delete(key);
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  // Cantidad de filtros activos en la barra (busqueda, pais, offering, level, CHG% y T&E approver).
  // Cada pais seleccionado cuenta como un filtro porque el filtro de pais es multiple.
  const activeFilterCount = useMemo(() => {
    let n = activeCountries.length;
    if (localQ.trim()) n += 1;
    if (offering) n += 1;
    if (level) n += 1;
    if (chgBucket) n += 1;
    if (teApprover) n += 1;
    return n;
  }, [activeCountries, localQ, offering, level, chgBucket, teApprover]);

  // Resetea todos los filtros de la barra a su valor por defecto de una sola vez
  function clearAllFilters() {
    setLocalQ('');
    setTeApproverSearch('');
    const p = new URLSearchParams(searchParams.toString());
    for (const key of ['q', 'country', 'offering', 'level', 'chg_bucket', 'te_approver']) {
      p.delete(key);
    }
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  function toggleCountry(v: string) {
    const current = country ? country.split(',') : [];
    const next = current.includes(v) ? current.filter((c) => c !== v) : [...current, v];
    setParam('country', next.join(','));
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleExport() {
    const rows = sortedPaged.map((e) => ({
      EID: e.id,
      Nombre: e.name,
      Pais: e.country,
      CL: e.level,
      Cliente: e.client ?? '',
      'Roll On': e.rollOn ?? '',
      'Roll Off': e.rollOff ?? '',
      'Days to Availability': days2AvailMap.get(e.id) ?? 0,
      ...Object.fromEntries(periods.map((p, i) => [`CHG% HL ${p.label}`, e.cp[i] ?? 0])),
      ...Object.fromEntries(periods.map((p, i) => [`CHG% SL ${p.label}`, e.slAssumed[i] ?? 0])),
      ...Object.fromEntries(periods.map((p, i) => [`CHG Neto ${p.label}`, e.chgNeto?.[i] ?? 0])),
      ...Object.fromEntries(periods.map((p, i) => [`Assumption ${p.label}`, e.assumptionKind?.[i] ?? ''])),
    }));
    exportToXlsx(rows, 'todos-empleados-forecast');
  }

  const STATUS_OPTIONS = [
    { value: 'green', label: t('statusChargeable') },
    { value: 'yellow', label: t('statusAtRisk') },
    { value: 'red', label: t('statusNotChargeable') },
    { value: 'unassigned', label: t('statusUnassigned') },
  ];

  const OFFERING_OPTIONS = [
    { value: 'SO',     label: 'SO' },
    { value: 'PR',     label: 'PR' },
    { value: 'Tools',  label: 'Tools' },
    { value: 'S4',     label: 'S4' },
    { value: 'Ariba',  label: 'Ariba' },
    { value: 'Oracle', label: 'Oracle' },
  ];

  const LEVEL_OPTIONS = [
    { value: '6',  label: '6' },
    { value: '7',  label: '7' },
    { value: '8',  label: '8' },
    { value: '9',  label: '9' },
    { value: '10', label: '10' },
    { value: '11', label: '11' },
    { value: '12', label: '12' },
    { value: '13', label: '13' },
  ];

  const CHG_BUCKET_OPTIONS = [
    { value: 'over', label: '>100%' },
    { value: 'full', label: '=100%' },
    { value: 'under', label: '<100%' },
  ];

  const teApproversFiltered = teApprovers.filter((name) =>
    name.toLowerCase().includes(teApproverSearch.toLowerCase()),
  );

  if (isFetching && !result) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-[420px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3">

      <div className="flex items-center gap-2 flex-wrap pb-1">
        <span className="text-sm font-semibold text-[var(--G1)] min-w-[200px] tracking-tight">
          {toolbarLabel}
        </span>

        <button
          onClick={() => navigate(-1)}
          disabled={isFetching}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--G5)] bg-white text-[var(--G3)] hover:bg-[var(--G6)] hover:text-[var(--G1)] disabled:opacity-40 transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          onClick={() => navigate(1)}
          disabled={isFetching}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--G5)] bg-white text-[var(--G3)] hover:bg-[var(--G6)] hover:text-[var(--G1)] disabled:opacity-40 transition-colors"
        >
          <ChevronRight size={15} />
        </button>
        <button
          onClick={() => { setWindowAnchor(startOfDay(new Date())); }}
          className="px-2.5 h-8 text-xs font-medium rounded-lg border border-[var(--G5)] bg-white text-[var(--G3)] hover:bg-[var(--G6)] hover:text-[var(--G1)] transition-colors"
        >
          Hoy
        </button>

        <div className="flex-1" />

        <div className="flex border border-[var(--G5)] rounded-lg overflow-hidden bg-white">
          {(['HL', 'SL', 'NETO'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setParam('chg', mode)}
              className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${chgType === mode
                ? 'bg-[var(--P)] text-white'
                : 'text-[var(--G3)] hover:text-[var(--G1)]'
                }`}
            >
              {mode === 'NETO' ? 'CHG Neto' : t(mode === 'HL' ? 'toggleHL' : 'toggleSL')}
            </button>
          ))}
        </div>

        <div className="flex border border-[var(--G5)] rounded-lg overflow-hidden bg-white">
          {(['daily', 'forecast'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${viewMode === mode
                ? 'bg-[var(--P)] text-white'
                : 'text-[var(--G3)] hover:text-[var(--G1)]'
                }`}
            >
              {mode === 'daily' ? 'Diario' : 'Forecast'}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={handleExport}>
          {t('exportBtn')}
        </Button>
      </div>

      <FilterBar
        search={{ value: localQ, onChange: setLocalQ, placeholder: t('searchPlaceholder') }}
        toggleGroups={[
          {
            label: t('filterCountry'),
            options: [
              { value: 'AR', label: 'AR' },
              { value: 'MX', label: 'MX' },
              { value: 'CR', label: 'CR' },
            ],
            active: activeCountries,
            onToggle: toggleCountry,
            multi: true,
          },
          {
            label: 'Offering',
            options: OFFERING_OPTIONS,
            active: offering ? [offering] : [],
            onToggle: (v) => setParam('offering', offering === v ? '' : v),
          },
          {
            label: 'Level',
            options: LEVEL_OPTIONS,
            active: level ? [level] : [],
            onToggle: (v) => setParam('level', level === v ? '' : v),
          },
          {
            label: 'CHG%',
            options: CHG_BUCKET_OPTIONS,
            active: chgBucket ? [chgBucket] : [],
            onToggle: (v) => setParam('chg_bucket', chgBucket === v ? '' : v),
          },
        ]}
        trailing={(
          /* Queda siempre a la vista, apagado cuando no hay nada que limpiar, para que se
             sepa que la opcion existe sin tener que descubrirla tocando un filtro. */
          <button
            type="button"
            onClick={clearAllFilters}
            disabled={activeFilterCount === 0}
            title={activeFilterCount > 0 ? 'Limpiar todos los filtros' : 'No hay filtros aplicados'}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
              activeFilterCount > 0
                ? 'border-[var(--P)] bg-[var(--PBG)] text-[var(--PD)] hover:bg-white cursor-pointer'
                : 'border-[var(--G5)] text-[var(--G3)] cursor-default'
            }`}
          >
            <X size={11} />
            {activeFilterCount > 0 ? `Limpiar filtros (${activeFilterCount})` : 'Limpiar filtros'}
          </button>
        )}
      />

      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--G3)] whitespace-nowrap">T&amp;E Approver:</span>
        {teApprover ? (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[var(--P)] text-white rounded-full text-xs font-medium">
            {teApprover}
            <button
              type="button"
              onClick={() => { setTeApproverSearch(''); setParam('te_approver', ''); }}
              className="hover:opacity-70 transition-opacity"
            >
              <X size={11} />
            </button>
          </span>
        ) : (
          <div className="relative">
            <input
              type="text"
              placeholder="buscar..."
              value={teApproverSearch}
              onChange={(e) => { setTeApproverSearch(e.target.value); setShowTeApproverDrop(true); }}
              onFocus={() => setShowTeApproverDrop(true)}
              onBlur={() => setTimeout(() => setShowTeApproverDrop(false), 150)}
              className="px-2.5 py-0.5 text-xs border border-[var(--G5)] rounded-md bg-white text-[var(--G1)] placeholder-[var(--G4)] focus:outline-none focus:border-[var(--P)] focus:ring-1 focus:ring-[var(--P)] w-32"
            />
            {showTeApproverDrop && (teApproversFiltered.length > 0 || teApproverSearch.length > 0) && (
              <ul className="absolute z-50 left-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto min-w-[180px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--G5)]">
                {teApproversFiltered.map((name) => (
                  <li
                    key={name}
                    onMouseDown={() => {
                      setParam('te_approver', name);
                      setTeApproverSearch('');
                      setShowTeApproverDrop(false);
                    }}
                    className="px-3 py-2 text-xs cursor-pointer text-[var(--G1)] hover:bg-[var(--G6)]"
                  >
                    {name}
                  </li>
                ))}
                {teApproverSearch.length > 0 && !teApprovers.includes(teApproverSearch) && (
                  <li
                    onMouseDown={() => {
                      setParam('te_approver', teApproverSearch);
                      setTeApproverSearch('');
                      setShowTeApproverDrop(false);
                    }}
                    className="px-3 py-2 text-xs cursor-pointer text-[var(--P)] border-t border-[var(--G6)] hover:bg-[var(--PB)]"
                  >
                    + Usar &quot;{teApproverSearch}&quot;
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--G3)]">{t('countEmployees', { count: result?.total ?? 0 })}</p>

      {viewMode === 'forecast' ? (

        <div className={`space-y-3 transition-opacity duration-200 ${isFetching ? 'opacity-60 pointer-events-none' : ''}`}>

          {/* Resumen ejecutivo: totales del Excel (hoja 'Forecast Update', filas 3 a 8), el
              total por pais mas el desglose de Argentina por offering. Van en su PROPIA tabla,
              con columnas anchas y tipografia grande, porque metidos entre las 21 columnas
              angostas de la tabla de empleados competian con los datos y no se leian.
              Es un bloque OPCIONAL: si el endpoint de totales falla, da 404 o vuelve vacio,
              totalRows queda en [] y aca no se renderiza nada, sin tocar la tabla de abajo. */}
          {totalRows.length > 0 && (
            <div
              ref={totalsBlockRef}
              className="sticky z-20 border border-[var(--G5)] rounded-xl bg-white shadow-[0_1px_3px_rgba(20,25,40,.04)] overflow-x-auto"
              style={{ top: 'var(--topbar-h)' }}
            >
              <button
                type="button"
                onClick={() => setTotalsOpen((o) => !o)}
                aria-expanded={totalsOpen}
                title={totalsOpen ? 'Colapsar totales' : 'Expandir totales'}
                className="w-full flex items-baseline gap-2 flex-wrap px-4 pt-3 pb-2.5 text-left hover:bg-[var(--G6)] transition-colors rounded-t-xl cursor-pointer"
              >
                {totalsOpen
                  ? <ChevronUp size={13} className="text-[var(--G3)] self-center shrink-0" />
                  : <ChevronDown size={13} className="text-[var(--G3)] self-center shrink-0" />}
                <h2 className="text-sm font-bold text-[var(--G1)] tracking-tight">
                  Totales de cargabilidad
                </h2>
                <span className="text-[11px] text-[var(--G3)]">
                  {chgType === 'NETO' ? 'CHG Neto' : `CHG ${chgType}`} sobre los {result?.total ?? 0} empleados filtrados.
                  {totalsOpen ? ' Solo se listan los grupos con gente.' : ` ${totalRows.length} grupos.`}
                </span>
              </button>

              <table
                style={{
                  display: totalsOpen ? undefined : 'none',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  tableLayout: 'fixed',
                  width: '100%',
                  minWidth: TOT_LABEL_W + TOT_HC_W + periods.length * TOT_PERIOD_W,
                }}
              >
                <colgroup>
                  <col style={{ width: TOT_LABEL_W }} />
                  <col style={{ width: TOT_HC_W }} />
                  {periods.flatMap((_, i) => [
                    <col key={`tot-chg-${i}`} style={{ width: TOT_CHG_W }} />,
                    <col key={`tot-sah-${i}`} style={{ width: TOT_SAH_W }} />,
                    <col key={`tot-pct-${i}`} style={{ width: TOT_PCT_W }} />,
                  ])}
                </colgroup>
                <thead>
                  <tr>
                    <th className="bg-[#eef2f8] text-left px-4 py-1.5 text-[11px] font-semibold text-[var(--G3)] tracking-wide border-y border-r border-[var(--G5)]">
                      Grupo
                    </th>
                    <th
                      title="HC S&P: headcount del grupo dentro del set filtrado"
                      className="bg-[#eef2f8] text-center py-1.5 text-[11px] font-semibold text-[var(--G3)] tracking-wide border-y border-r-2 border-[var(--G5)]"
                    >
                      HC
                    </th>
                    {periods.map((p, i) => (
                      <th
                        key={p.label}
                        colSpan={3}
                        className={`text-center text-[11px] font-semibold py-1.5 px-1 tracking-wide overflow-hidden border-y border-r border-l-2 border-[var(--G5)] last:border-r-0 ${i === currentPIdx ? 'bg-[#e8effc] text-[#2f5bb7]' : 'bg-[#eef2f8] text-[var(--G3)]'}`}
                      >
                        {p.label}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="bg-[#f6f8fb] border-b border-r border-[var(--G5)]" />
                    <th className="bg-[#f6f8fb] border-b border-r-2 border-[var(--G5)]" />
                    {periods.map((p, i) => (
                      <Fragment key={p.label}>
                        <th className={`text-center text-[9px] font-semibold text-[var(--G4)] py-1 border-b border-r border-l-2 border-[var(--G5)] ${i === currentPIdx ? 'bg-[#eff4fd]' : 'bg-[#f6f8fb]'}`}>CHG</th>
                        <th className={`text-center text-[9px] font-semibold text-[var(--G4)] py-1 border-b border-r border-[var(--G5)] ${i === currentPIdx ? 'bg-[#eff4fd]' : 'bg-[#f6f8fb]'}`}>SAH</th>
                        <th className={`text-center text-[9px] font-semibold text-[var(--G4)] py-1 border-b border-r border-[var(--G5)] last:border-r-0 ${i === currentPIdx ? 'bg-[#eff4fd]' : 'bg-[#f6f8fb]'}`}>CHG%</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {totalRows.map((row, rowIdx) => {
                    const isLast = rowIdx === totalRows.length - 1;
                    const bottom = isLast ? '' : 'border-b';
                    const isOffering = row.kind === 'offering';
                    // Las filas de offering se subordinan a su pais: indentadas y en blanco
                    const rowBg = isOffering ? 'bg-white' : 'bg-[#f2f6fc]';
                    const curBg = isOffering ? 'bg-[#f8fbff]' : 'bg-[#e7eefa]';
                    return (
                      <tr key={row.key}>
                        <td
                          className={`${rowBg} ${bottom} border-r border-[var(--G5)] py-2`}
                          style={{ paddingLeft: isOffering ? 30 : 16, paddingRight: 12 }}
                        >
                          <span className={`block truncate ${isOffering ? 'text-[12px] font-medium text-[var(--G2)]' : 'text-[13px] font-bold text-[var(--G1)]'}`}>
                            {row.label}
                          </span>
                          <span className="block text-[10px] text-[var(--G4)]" title="Target de cargabilidad de la fila">
                            Target {row.targetPct}%
                          </span>
                        </td>
                        <td
                          title="HC S&P: headcount del grupo dentro del set filtrado"
                          className={`${rowBg} ${bottom} border-r-2 border-[var(--G5)] text-center`}
                        >
                          <span className="text-[13px] font-semibold text-[var(--G2)]">{row.hc}</span>
                        </td>
                        {/* Se itera SIEMPRE sobre los periodos de la tabla, no sobre los que
                            trajo el endpoint: asi las columnas de totales no se pueden
                            desalinear con las etiquetas de periodo de la tabla de empleados. */}
                        {periods.map((_, i) => {
                          const tot = row.periods[i];
                          const chg = tot ? chgForMode(tot, chgType) : null;
                          // Excel: =+CO3/CP3, promedio PONDERADO por horas (Î£CHG / Î£SAH),
                          // no el promedio de los CHG% individuales de cada empleado
                          // Se guarda sin redondear y se formatea a 1 decimal en el render, para
                          // que 81 salga como "81.0%" y no como "81%".
                          const pct = tot && chg != null && tot.sah > 0
                            ? (chg / tot.sah) * 100
                            : null;
                          const overTarget = pct != null && pct >= row.targetPct;
                          const cellBg = i === currentPIdx ? curBg : rowBg;
                          return (
                            <Fragment key={i}>
                              <td className={`${bottom} border-r border-l-2 border-[var(--G5)] text-center ${cellBg}`}>
                                <span className="text-[12px] font-semibold text-[var(--G1)]">{chg != null ? fmtHours(chg) : '—'}</span>
                              </td>
                              <td className={`${bottom} border-r border-[var(--G5)] text-center ${cellBg}`}>
                                <span className="text-[12px] font-semibold text-[#4a72c4]">{tot ? fmtHours(tot.sah) : '—'}</span>
                              </td>
                              <td
                                title={pct != null ? `${pct.toFixed(1)}% vs target ${row.targetPct}%` : undefined}
                                className={`${bottom} border-r border-[var(--G5)] last:border-r-0 text-center ${cellBg}`}
                              >
                                {pct == null ? (
                                  <span className="text-[12px] text-[var(--G4)]">—</span>
                                ) : (
                                  <span className={`text-[12px] font-bold whitespace-nowrap ${overTarget ? 'text-[var(--GR)]' : 'text-[var(--RD)]'}`}>
                                    {overTarget ? '▲' : '▼'} {pct.toFixed(1)}%
                                  </span>
                                )}
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Sin overflow propio: la tabla scrollea con la pagina y el header de columnas se
              queda pegado arriba, debajo del bloque de totales. */}
          <div className="border border-[var(--G5)] rounded-xl bg-white shadow-[0_1px_3px_rgba(20,25,40,.04)]">
          <table
            style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'fixed',
              width: '100%',
              minWidth: EMP_FIXED_W + periods.length * EMP_PERIOD_W,
            }}
          >
            <colgroup>
              {/* Nombre */}
              <col style={{ width: EMP_NAME_W }} />
              {/* Days2Avail */}
              <col style={{ width: EMP_D2A_W }} />
              {/* Roll-on y Roll-off */}
              <col style={{ width: EMP_ROLL_W }} />
              <col style={{ width: EMP_ROLL_W }} />
              {periods.flatMap((_, i) => [
                <col key={`fc-chg-${i}`} style={{ width: EMP_CHG_W }} />,
                <col key={`fc-sah-${i}`} style={{ width: EMP_SAH_W }} />,
                <col key={`fc-pct-${i}`} style={{ width: EMP_PCT_W }} />,
              ])}
            </colgroup>
            <thead>
              <tr ref={headRowRef}>
                <th style={{ position: 'sticky', top: headTop }} className="z-20 bg-[#f4f6f9] text-left px-2 py-1.5 text-[10px] font-semibold text-[var(--G3)] tracking-wide border-b border-r border-[var(--G5)] whitespace-nowrap">
                  <button className="flex items-center gap-1 hover:text-[var(--G1)] transition-colors" onClick={() => handleSort('name')}>
                    {t('title')} <SortIcon field="name" />
                  </button>
                </th>
                {/* Days to Availability header */}
                <th style={{ position: 'sticky', top: headTop }} className="z-20 bg-[#f4f6f9] text-center text-[10px] font-semibold text-[var(--G3)] tracking-wide border-b border-r border-[var(--G5)] px-0.5 py-1.5 whitespace-nowrap">
                  <button className="flex items-center gap-0.5 mx-auto hover:text-[var(--G1)] transition-colors" onClick={() => handleSort('days2avail')}>
                    D2A <SortIcon field="days2avail" />
                  </button>
                </th>
                <th style={{ position: 'sticky', top: headTop }} className="z-20 bg-[#f4f6f9] text-center text-[10px] font-semibold text-[var(--G3)] tracking-wide border-b border-r border-[var(--G5)] px-0.5 py-1.5 whitespace-nowrap">
                  Roll-on
                </th>
                <th style={{ position: 'sticky', top: headTop }} className="z-20 bg-[#f4f6f9] text-center text-[10px] font-semibold text-[var(--G3)] tracking-wide border-b border-r-2 border-[var(--G5)] px-0.5 py-1.5 whitespace-nowrap">
                  Roll-off
                </th>
                {periods.map((p, i) => (
                  <th
                    key={p.label}
                    colSpan={3}
                    style={{ position: 'sticky', top: headTop, maxWidth: EMP_PERIOD_W }}
                    className={`z-20 text-center text-[10px] font-semibold py-1.5 px-0.5 tracking-wide overflow-hidden border-b border-r border-l-2 border-[var(--G5)] last:border-r-0 ${i === currentPIdx ? 'bg-[#e8effc] text-[#2f5bb7]' : 'bg-[#f4f6f9] text-[var(--G3)]'}`}
                  >
                    {p.label}
                    <span className="block text-[8px] font-normal text-[var(--G4)] leading-tight">
                      {[['AR', 'Argentina'], ['MX', 'Mexico'], ['CR', 'Costa Rica']]
                        .map(([code, full]) => {
                          const v = p.sahByCountry?.[full] ?? p.sahByCountry?.[code];
                          return v != null ? `${code} ${Math.round(v)}` : null;
                        })
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ position: 'sticky', top: headSubTop }} className="z-20 bg-[#f4f6f9] border-b border-r border-[var(--G5)]" />
                <th style={{ position: 'sticky', top: headSubTop }} className="z-20 bg-[#f4f6f9] border-b border-r border-[var(--G5)]" />
                <th style={{ position: 'sticky', top: headSubTop }} className="z-20 bg-[#f4f6f9] border-b border-r border-[var(--G5)]" />
                <th style={{ position: 'sticky', top: headSubTop }} className="z-20 bg-[#f4f6f9] border-b border-r-2 border-[var(--G5)]" />
                {periods.map((p, i) => (
                  <Fragment key={p.label}>
                    <th style={{ position: 'sticky', top: headSubTop }} className={`z-20 text-center text-[9px] font-semibold text-[var(--G3)] py-0.5 border-b border-r border-l-2 border-[var(--G5)] ${i === currentPIdx ? 'bg-[#e8effc]' : 'bg-[#f4f6f9]'}`}>CHG</th>
                    <th style={{ position: 'sticky', top: headSubTop }} className={`z-20 text-center text-[9px] font-semibold text-[var(--G3)] py-0.5 border-b border-r border-[var(--G5)] ${i === currentPIdx ? 'bg-[#dce8fc]' : 'bg-[#f4f6f9]'}`}>SAH</th>
                    <th style={{ position: 'sticky', top: headSubTop }} className={`z-20 text-center text-[9px] font-semibold text-[var(--G3)] py-0.5 border-b border-r border-[var(--G5)] last:border-r-0 ${i === currentPIdx ? 'bg-[#e8effc]' : 'bg-[#f4f6f9]'}`}>
                      <button className="flex items-center gap-0.5 mx-auto hover:text-[var(--G1)] transition-colors" onClick={() => handleSort('chgPct')}>
                        CHG% <SortIcon field="chgPct" />
                      </button>
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>

              {paged.length === 0 ? (
                <tr>
                  <td colSpan={4 + periods.length * 3} className="text-center text-sm text-[var(--G3)] py-12">
                    Sin empleados
                  </td>
                </tr>
              ) : sortedPaged.map((emp) => {
                const fRollOn = parseDDMMYY(emp.rollOn);
                const fRollOff = parseDDMMYY(emp.rollOff);
                const fPtoStart = parseDDMMYY(emp.nextPTO);
                const fPtoEnd = parseDDMMYY(emp.nextPTOEnd);
                const fSick = sickRangesMap.get(emp.id) ?? [];
                const rowTone = ROW_TONE[assumptionKind(emp)];
                const d2a = days2AvailMap.get(emp.id) ?? 0;
                const d2aColor = d2a <= 14 ? 'text-[var(--RD)]' : d2a <= 30 ? 'text-[var(--YL)]' : 'text-[var(--GR)]';
                const d2aLabel = emp.rollOff ? `${d2a}d` : '—';                // Offering label: Ãºltimo segmento del offering o projectType
                const offeringLabel = emp.projectType ?? emp.country ?? '';
                const clientLabel = emp.client && emp.client.trim() && emp.client.trim().toLowerCase() !== 'unassigned'
                  ? emp.client
                  : 'Sin proyecto';
                return (
                  <tr key={emp.id} className={`group ${rowTone}`}>
                    <td className={`border-b border-r border-[var(--G5)] px-2 py-1.5 ${rowTone}`}>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                          style={{ background: avatarColor(emp.id) }}
                        >
                          {getInitials(emp.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-[11px] font-semibold text-[var(--G1)] truncate" title={emp.name}>{emp.name}</span>
                          <span className="block text-[9px] text-[var(--G4)] truncate" title={clientLabel}>
                            {emp.level} · {offeringLabel} · {clientLabel}
                          </span>
                        </div>
                      </div>
                    </td>
                    {/* Days to Availability */}
                    <td className={`border-b border-r border-[var(--G5)] text-center h-[32px] ${rowTone}`} style={{ padding: 0 }}>
                      {fRollOff ? (
                        <span className={`text-[10px] font-semibold ${emp.rollOff ? d2aColor : 'text-[var(--G4)]'}`}>{d2aLabel}</span>
                      ) : (
                        <span className="text-[10px] text-[var(--G4)]">—</span>
                      )}
                    </td>
                    {/* Roll-on / Roll-off */}
                    <td className={`border-b border-r border-[var(--G5)] text-center h-[32px] ${rowTone}`} style={{ padding: 0 }}>
                      <span className={`text-[10px] ${emp.rollOn ? 'text-[var(--G1)] font-medium' : 'text-[var(--G4)]'}`}>
                        {formatRollDate(emp.rollOn)}
                      </span>
                    </td>
                    <td className={`border-b border-r-2 border-[var(--G5)] text-center h-[32px] ${rowTone}`} style={{ padding: 0 }}>
                      <span className={`text-[10px] ${emp.rollOff ? 'text-[var(--G1)] font-medium' : 'text-[var(--G4)]'}`}>
                        {formatRollDate(emp.rollOff)}
                      </span>
                    </td>
                    {periods.map((period, i) => {
                      const sah = emp.sah[i] ?? 0;
                      // CHG Neto = chg_hl + chg_sl del backend
                      const netoVal = emp.chgNeto?.[i] != null
                        ? emp.chgNeto[i]
                        : (emp.chgHl?.[i] ?? 0) + (emp.chgSl?.[i] ?? 0);

                      // CHG y CHG% segun el modo elegido en el toggle
                      const chgRaw = chgType === 'HL'
                        ? (emp.chgHl?.[i] ?? emp.chgEffective?.[i] ?? 0)
                        : chgType === 'SL'
                          ? (emp.chgSl?.[i] ?? emp.chgAssumption?.[i] ?? 0)
                          : netoVal;
                      const chgLabel = `${Math.round(chgRaw)}`;

                      const hlPctReal = sah > 0
                        ? Math.round(((emp.chgHl?.[i] ?? 0) / sah) * 100)
                        : 0;
                      const p = chgType === 'HL'
                        ? hlPctReal
                        : chgType === 'SL'
                          ? Math.round(emp.slAssumed[i] ?? 0)
                          : (sah > 0 ? Math.round((netoVal / sah) * 100) : 0);

                      // Color de celda segun el subtipo de assumption del Excel
                      // Bug 4: si cargable = 0, no colorear (blanco = Hard Lock)
                      const aKind = chgRaw > 0 ? (emp.assumptionKind?.[i] ?? null) : null;
                      const aStyle = aKind ? ASSUMPTION_CELL[aKind as keyof typeof ASSUMPTION_CELL] : undefined;
                      const cellBg = aStyle ? { background: aStyle.bg } : undefined;
                      const cellTitle = aStyle ? aStyle.label : undefined;
                      const cellColor = 'text-[var(--G1)]';
                      const isCur = i === currentPIdx;
                      return (
                        <Fragment key={i}>
                          <td
                            title={cellTitle}
                            className={`border-b border-r border-l-2 border-[var(--G5)] text-center h-[32px] ${aStyle ? '' : isCur ? 'bg-[#f0f5ff]' : 'bg-white'}`}
                            style={{ padding: 0, ...cellBg }}
                          >
                            <span className="text-[10px] font-semibold" style={aStyle ? { color: aStyle.fg } : undefined}>{chgLabel}</span>
                          </td>
                          <td className={`border-b border-r border-[var(--G5)] text-center h-[32px] ${isCur ? 'bg-[#f0f5ff]' : 'bg-white'}`} style={{ padding: 0 }}>
                            {/* Sin SAH cargado se muestra un guion. Antes caia en una constante
                                por pais y pintaba un numero inventado, que hacia parecer que el
                                periodo tenia horas disponibles cuando en realidad no hay dato. */}
                            <span className="text-[10px] font-semibold text-[#4a72c4]">
                              {sah > 0 ? Math.round(sah) : <span className="text-[var(--G4)]">—</span>}
                            </span>
                          </td>
                          {(() => {
                            const isClickable = p !== 100 && employeeIdsWithTickets.has(emp.id);
                            return (
                              <td
                                title={cellTitle}
                                className={`border-b border-r border-[var(--G5)] last:border-r-0 text-center h-[32px] ${aStyle ? '' : isCur ? 'bg-[#f0f5ff]' : 'bg-white'} ${isClickable ? 'cursor-pointer hover:brightness-95' : ''}`}
                                style={{ padding: 0, ...cellBg }}
                                onClick={isClickable ? () => {
                                  const empTickets = allTickets.filter((t) => t.employeeId === emp.id);
                                  setChgModal({ emp, tickets: empTickets });
                                } : undefined}
                              >
                                <span className="text-[10px] font-semibold whitespace-nowrap" style={aStyle ? { color: aStyle.fg } : undefined}>
                                  {p}%
                                  {isClickable && <span className="ml-0.5 text-[8px] opacity-50">i</span>}
                                </span>
                              </td>
                            );
                          })()}
                        </Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>

      ) : (

        <div className={`overflow-x-auto border border-[var(--G5)] rounded-xl bg-white shadow-[0_1px_3px_rgba(20,25,40,.04)] transition-opacity duration-200 ${isFetching ? 'opacity-60 pointer-events-none' : ''}`}>
          <table
            style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'fixed',
              width: '100%',
              minWidth: 172 + nDays * DAY_W + 3 * SUMMARY_W,
            }}
          >
            <colgroup>
              <col />
              {days.map((d) => <col key={d.idx} style={{ width: colW }} />)}
              <col style={{ width: SUMMARY_W }} />
              <col style={{ width: SUMMARY_W }} />
              <col style={{ width: SUMMARY_W }} />
            </colgroup>

            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-[#f4f6f9] text-left px-3 py-2 text-[11px] font-semibold text-[var(--G3)] tracking-wide border-b border-r border-[var(--G5)] whitespace-nowrap">
                  <button className="flex items-center gap-1 hover:text-[var(--G1)] transition-colors" onClick={() => handleSort('name')}>
                    {t('title')} <SortIcon field="name" />
                  </button>
                </th>
                {dayGroups.map((g) => (
                  <th
                    key={g.key}
                    colSpan={g.count}
                    className="bg-[#f4f6f9] text-center text-[11px] font-semibold text-[var(--G3)] py-2 px-1 tracking-wide border-b border-r border-[var(--G5)] last:border-r-0"
                  >
                    {g.label}
                  </th>
                ))}
                <th colSpan={3} className="bg-[#f4f6f9] text-center text-[11px] font-semibold text-[var(--G3)] py-2 px-1 tracking-wide border-b border-l border-[var(--G5)]">
                  Resumen
                </th>
              </tr>

              <tr>
                <th className="sticky left-0 z-20 bg-[#f4f6f9] border-b border-r border-[var(--G5)]" />
                {days.map((d) => (
                  <th
                    key={d.idx}
                    className={`text-center border-b border-r border-[var(--G5)] last:border-r-0 ${d.weekend ? 'bg-[#fafbfc]' : 'bg-[#f4f6f9]'}`}
                  >
                    <span className={`block text-xs font-semibold ${d.weekend ? 'text-[var(--G4)]' : 'text-[var(--G1)]'}`}>
                      {d.num}
                    </span>
                    <span className="block text-[9px] text-[var(--G4)] uppercase tracking-wide">
                      {DOW_ES[d.dow]}
                    </span>
                  </th>
                ))}
                <th className="bg-[#f4f6f9] text-center text-[10px] font-semibold text-[var(--G3)] py-1 border-b border-l border-[var(--G5)]">CHG</th>
                <th className="bg-[#f4f6f9] text-center text-[10px] font-semibold text-[var(--G3)] py-1 border-b border-l border-[var(--G5)]">SAH</th>
                <th className="bg-[#f4f6f9] text-center text-[10px] font-semibold text-[var(--G3)] py-1 border-b border-l border-[var(--G5)]">
                  <button className="flex items-center gap-0.5 mx-auto hover:text-[var(--G1)] transition-colors" onClick={() => handleSort('chgPct')}>
                    CHG% <SortIcon field="chgPct" />
                  </button>
                </th>
              </tr>
            </thead>

            <motion.tbody
              key={`${debouncedQ}-${status}-${country}-${offering}-${level}-${teApprover}-${chgBucket}-${windowStart.getTime()}-${refreshKey}`}
              initial="hidden"
              animate="visible"
              variants={TBODY_VARIANTS}
            >
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={nDays + 4} className="text-center text-sm text-[var(--G3)] py-12">
                    Sin empleados
                  </td>
                </tr>
              ) : (
                sortedPaged.flatMap((emp) => {
                  const isExpanded = !!expanded[emp.id];
                  const pIdx = currentPIdx;
                  const sahForPeriod = emp.sah?.[pIdx] ?? emp.totalHours ?? 80;
                  const dailySAH = 8;
                  const sahDay = Math.round(dailySAH);
                  const rollOnDate = parseDDMMYY(emp.rollOn);
                  const rollOffDate = parseDDMMYY(emp.rollOff);
                  const ptoStart = parseDDMMYY(emp.nextPTO);
                  const ptoEnd = parseDDMMYY(emp.nextPTOEnd);
                  const rowTone = ROW_TONE[assumptionKind(emp)];

                  const chgPct = chgType === 'HL'
                    ? (emp.cp[pIdx] ?? 0)
                    : chgType === 'SL'
                      ? (emp.slAssumed[pIdx] ?? 0)
                      : (sahForPeriod > 0 ? Math.round(((emp.chgNeto?.[pIdx] ?? 0) / sahForPeriod) * 100) : 0);
                  const dailyCHG = 8 * chgPct / 100;
                  const dailyCHGLabel = `${Math.round(dailyCHG)}h`;

                  // Bug 3: usar valores del backend para el resumen (compatible con PPAs)
                  // No recalcular CHG desde horas/dÃ­a, sino tomar los valores reales del perÃ­odo
                  const summaryCHG = chgType === 'HL'
                    ? (emp.chgHl?.[pIdx] ?? 0)
                    : chgType === 'SL'
                      ? (emp.chgSl?.[pIdx] ?? 0)
                      : (emp.chgNeto?.[pIdx] ?? 0);

                  // Bug 2: SAH ajustado por dÃ­as de vacaciones dentro del perÃ­odo visible
                  const ptoDaysInWindow = days.filter((d) => {
                    if (d.weekend) return false;
                    if (isHoliday(d.date, emp.country)) return false;
                    return ptoStart !== null && ptoEnd !== null && d.date >= ptoStart && d.date <= ptoEnd;
                  }).length;
                  const adjustedSAH = Math.max(0, sahForPeriod - ptoDaysInWindow * 8);

                  const totalCHGLabel = `${Math.round(summaryCHG)}h`;
                  const realChgPct = adjustedSAH > 0 ? Math.round((summaryCHG / adjustedSAH) * 100) : 0;
                  const summaryColor = realChgPct >= 80 ? 'text-[var(--GR)]' : realChgPct >= 50 ? 'text-[var(--YL)]' : 'text-[var(--RD)]';

                  // Offering label para vista diario
                  const offeringLabel = emp.projectType ?? emp.country ?? '';

                  return [
                    <motion.tr key={emp.id} variants={ROW_VARIANTS} className={`group cursor-pointer select-none ${rowTone}${emp.isOnPTO ? ' opacity-50' : ''}`} onClick={() => toggleExpand(emp.id)}>
                      <td className={`sticky left-0 z-10 border-b border-r border-[var(--G5)] px-3 py-2 ${rowTone}`}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background: avatarColor(emp.id) }}
                          >
                            {getInitials(emp.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-[var(--G1)] truncate">{emp.name}</span>
                              {emp.isOnPTO && (
                                <span
                                  title={emp.nextPTO && emp.nextPTOEnd ? `En vacaciones: ${emp.nextPTO} a ${emp.nextPTOEnd}` : 'En vacaciones'}
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 cursor-default select-none flex-shrink-0"
                                >
                                  PTO
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-[var(--G4)] font-medium">{sahDay}h/dia · {offeringLabel}</div>
                          </div>
                          {isAdmin && ((emp.chgAssumption?.[0] ?? 0) > 0 || (emp.chgAssumption?.[1] ?? 0) > 0) && (
                            <button
                              title="Hacer efectivo"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--G3)] hover:text-[var(--P)] p-0.5 rounded flex-shrink-0"
                              onClick={(ev) => { ev.stopPropagation(); openEffectivizeModal(emp); }}
                            >
                              <PencilLine size={11} />
                            </button>
                          )}
                          <span className="text-[var(--G4)] flex-shrink-0">
                            {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          </span>
                        </div>
                      </td>

                      {days.map((d) => {
                        const isBeforeRollOn = chgType === 'HL' && rollOnDate !== null && d.date < rollOnDate;
                        const isAfterRollOff = chgType === 'HL' && rollOffDate !== null && d.date > rollOffDate;
                        const isOutOfRange = isBeforeRollOn || isAfterRollOff;
                        const holidayName = isHoliday(d.date, emp.country);
                        const isPtoDay = ptoStart !== null && ptoEnd !== null && d.date >= ptoStart && d.date <= ptoEnd;
                        const sickRanges = sickRangesMap.get(emp.id) ?? [];
                        const isSickDay = !d.weekend && !isPtoDay && sickRanges.some((r) => d.date >= r.start && d.date <= r.end);
                        const effectivePto = isPtoDay && !d.weekend;
                        return (
                          <td
                            key={d.idx}
                            className={`border-b border-r border-[var(--G5)] last:border-r-0 text-center align-middle h-[34px] ${
                              d.weekend ? 'bg-white' : holidayName ? 'bg-[#efefef]' : isOutOfRange ? 'bg-[#f7f7f7]' : effectivePto ? 'bg-amber-50' : isSickDay ? 'bg-blue-50' : 'bg-[#fafbfc]'
                            }`}
                            style={{ padding: 0 }}
                          >
                            {holidayName && !d.weekend ? (
                              <span className="text-[10px] font-semibold text-[var(--G4)]" title={holidayName}>FER</span>
                            ) : isOutOfRange ? (
                              <span className="block text-[11px] font-semibold leading-tight text-[var(--G4)]">0h</span>
                            ) : effectivePto ? (
                              <span className="text-[10px] font-semibold text-amber-500">PTO</span>
                            ) : isSickDay ? (
                              <span className="text-[10px] font-semibold text-blue-400">SIC</span>
                            ) : d.weekend ? null : (
                              <span className="block text-[11px] font-semibold leading-tight text-[var(--G1)]">
                                {dailyCHGLabel}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="border-b border-l border-[var(--G5)] text-center align-middle h-[34px] bg-[#f4f6f9]" style={{ padding: 0 }}>
                        <span className={`text-[11px] font-semibold ${summaryColor}`}>{totalCHGLabel}</span>
                      </td>
                      <td className="border-b border-l border-[var(--G5)] text-center align-middle h-[34px] bg-[#f4f6f9]" style={{ padding: 0 }}>
                        <span className="text-[11px] font-semibold text-[var(--G1)]">{Math.round(adjustedSAH)}h</span>
                      </td>
                      <td className="border-b border-l border-[var(--G5)] text-center align-middle h-[34px] bg-[#f4f6f9]" style={{ padding: 0 }}>
                        <span className={`text-[11px] font-semibold ${summaryColor}`}>{realChgPct}%</span>
                      </td>
                    </motion.tr>,

                    <AnimatePresence key={`${emp.id}-bar-presence`}>
                      {isExpanded && (
                        <motion.tr
                          key={`${emp.id}-bar`}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
                          exit={{ opacity: 0, y: -4, transition: { duration: 0.14, ease: 'easeIn' } }}
                        >
                          <td
                            className="sticky left-0 z-10 bg-white border-b border-r border-[var(--G5)] text-xs text-[var(--G3)] font-medium"
                            style={{ paddingLeft: 26, paddingRight: 12, paddingTop: 6, paddingBottom: 6 }}
                          >
                            {!isRefetching && (
                              <>
                                {emp.client ?? '-'}
                                <span className="ml-1 text-[9px] text-[var(--G4)]">
                                  ({emp.scenarioType === 'effective' ? 'HL' : 'SL'})
                                </span>
                              </>
                            )}
                          </td>
                          <td
                            colSpan={nDays}
                            className="border-b border-[var(--G5)] bg-white"
                            style={{ position: 'relative', height: 32, padding: isRefetching ? '6px 8px' : 0 }}
                          >
                            {isRefetching ? (
                              <Skeleton className="h-5 w-full rounded-sm" />
                            ) : (
                              rollOnDate && rollOffDate && (() => {
                                const barStart = rollOnDate < windowStart ? windowStart : rollOnDate;
                                const barEnd = rollOffDate > windowEnd ? windowEnd : rollOffDate;
                                if (barStart > windowEnd || barEnd < windowStart) return null;

                                const leftDays = Math.round((barStart.getTime() - windowStart.getTime()) / 86_400_000);
                                const widthDays = Math.round((barEnd.getTime() - barStart.getTime()) / 86_400_000) + 1;
                                const isHL = emp.scenarioType === 'effective';
                                const pctIdx = getPeriodIdx(barStart);
                                const pct = isHL
                                  ? (emp.cp[pctIdx >= 0 ? pctIdx : 0] ?? 0)
                                  : (emp.slAssumed[pctIdx >= 0 ? pctIdx : 0] ?? 0);

                                const barPtoStart = parseDDMMYY(emp.nextPTO);
                                const barPtoEnd = parseDDMMYY(emp.nextPTOEnd);
                                const ptoBar = barPtoStart && barPtoEnd ? (() => {
                                  const ps = barPtoStart < windowStart ? windowStart : barPtoStart;
                                  const pe = barPtoEnd > windowEnd ? windowEnd : barPtoEnd;
                                  if (ps > windowEnd || pe < windowStart) return null;
                                  const ptoLeft = Math.round((ps.getTime() - windowStart.getTime()) / 86_400_000);
                                  const ptoWidth = Math.round((pe.getTime() - ps.getTime()) / 86_400_000) + 1;
                                  return (
                                    <div
                                      title={`Vacaciones: ${emp.nextPTO} a ${emp.nextPTOEnd}`}
                                      style={{
                                        position: 'absolute',
                                        top: 6, bottom: 6,
                                        left: ptoLeft * colW,
                                        width: Math.max(ptoWidth * colW - 2, 0),
                                        borderRadius: 6,
                                        background: '#fef3c7',
                                        border: '1.5px solid #f59e0b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0 6px',
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: '#92400e',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        zIndex: 2,
                                      }}
                                    >
                                      PTO
                                    </div>
                                  );
                                })() : null;

                                return (
                                  <>
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: 6, bottom: 6,
                                        left: leftDays * colW,
                                        width: Math.max(widthDays * colW - 4, 0),
                                        borderRadius: 6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0 8px',
                                        fontSize: 10,
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        letterSpacing: '-0.01em',
                                        ...getBarStyle(emp, isHL),
                                      }}
                                    >
                                      {pct}% - {emp.client ?? 'Sin proyecto'}
                                    </div>
                                    {ptoBar}
                                  </>
                                );
                              })()
                            )}
                          </td>
                          <td className="border-b border-l border-[var(--G5)] bg-white" />
                          <td className="border-b border-l border-[var(--G5)] bg-white" />
                          <td className="border-b border-l border-[var(--G5)] bg-white" />
                        </motion.tr>
                      )}
                    </AnimatePresence>,

                    <AnimatePresence key={`${emp.id}-chart-presence`}>
                      {isExpanded && (
                        <motion.tr
                          key={`${emp.id}-chart`}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut', delay: 0.06 } }}
                          exit={{ opacity: 0, y: -4, transition: { duration: 0.14, ease: 'easeIn' } }}
                        >
                          <td
                            className="sticky left-0 z-10 bg-white border-b border-r border-[var(--G5)]"
                            style={{ paddingLeft: 26, paddingRight: 12, paddingTop: 6, paddingBottom: 10, verticalAlign: 'top' }}
                          >
                            <span style={{ fontSize: 10, color: 'var(--G4)', fontWeight: 500 }}>Forecast</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/employees/${emp.id}`); }}
                              style={{ fontSize: 10, color: 'var(--P)', fontWeight: 500, marginTop: 6, display: 'block', textAlign: 'left' }}
                              className="hover:underline"
                            >
                              Ver detalle
                            </button>
                          </td>
                          <td
                            colSpan={nDays}
                            className="border-b border-[var(--G5)] bg-white"
                            style={{ padding: '6px 16px 10px' }}
                          >
                            <div className="flex items-end gap-1.5" style={{ height: 72 }}>
                              {periods.map((p, i) => {
                                const hl = emp.cp[i] ?? 0;
                                const sl = emp.slAssumed[i] ?? 0;
                                const MAX_H = 48;
                                const hlH = Math.max(2, Math.round((hl / 100) * MAX_H));
                                const slH = Math.max(2, Math.round((sl / 100) * MAX_H));
                                const hlColor: string = hl >= 80 ? 'var(--GR)' : hl >= 50 ? 'var(--YL)' : 'var(--RD)';
                                return (
                                  <div
                                    key={p.label}
                                    className="flex flex-col items-center flex-shrink-0"
                                    style={{ width: 30, gap: 2 }}
                                  >
                                    <span style={{ fontSize: 8, fontWeight: 700, color: hlColor, lineHeight: 1 }}>
                                      {hl}%
                                    </span>
                                    <div className="relative w-full" style={{ height: MAX_H }}>
                                      {sl > 0 && (
                                        <motion.div
                                          initial={{ scaleY: 0 }}
                                          animate={{ scaleY: 1 }}
                                          transition={{ delay: 0.08 + i * 0.03, duration: 0.25, ease: 'easeOut' as const }}
                                          style={{
                                            transformOrigin: 'bottom',
                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                            height: slH,
                                            background: 'var(--G5)',
                                            borderRadius: '3px 3px 0 0',
                                          }}
                                        />
                                      )}
                                      <motion.div
                                        initial={{ scaleY: 0 }}
                                        animate={{ scaleY: 1 }}
                                        transition={{ delay: 0.11 + i * 0.03, duration: 0.25, ease: 'easeOut' as const }}
                                        style={{
                                          transformOrigin: 'bottom',
                                          position: 'absolute', bottom: 0,
                                          left: sl > 0 ? 3 : 0, right: sl > 0 ? 3 : 0,
                                          height: hlH,
                                          background: hlColor,
                                          borderRadius: '3px 3px 0 0',
                                          opacity: 0.88,
                                        }}
                                      />
                                    </div>
                                    <span style={{ fontSize: 7, color: 'var(--G4)', lineHeight: 1.2, textAlign: 'center', width: '100%' }}>
                                      {p.label.split('-').pop()}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="border-b border-l border-[var(--G5)] bg-white" />
                          <td className="border-b border-l border-[var(--G5)] bg-white" />
                          <td className="border-b border-l border-[var(--G5)] bg-white" />
                        </motion.tr>
                      )}
                    </AnimatePresence>,
                  ];
                })
              )}
            </motion.tbody>
          </table>
        </div>

      )}

      {viewMode === 'forecast' && (
        <div className="flex gap-4 flex-wrap items-center pt-1">
          {/* Leyenda de assumptions - colores del Excel */}
          {Object.entries(ASSUMPTION_CELL).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-[11px] text-[var(--G3)] font-medium">
              <div className="w-6 h-[13px] rounded-[3px] border border-[var(--G5)]" style={{ background: v.bg }} />
              {v.label}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--G3)] font-medium">
            <div className="w-6 h-[13px] rounded-[3px] border border-[var(--G5)] bg-white" />
            Hard Lock
          </div>
        </div>
      )}

      {viewMode === 'daily' && (
        <div className="flex gap-4 flex-wrap items-center pt-1">
          {[
            { style: { background: '#e8effc', border: '1.5px solid #5b8def' }, label: 'Hard Lock (efectivo)' },
            { style: { background: '#fef2f2', border: '1.5px dashed #f87171' }, label: 'Assumption 1 - No ISG' },
            { style: { background: '#fff7ed', border: '1.5px dashed #f97316' }, label: 'Assumption 2 - ISG Ringfenced' },
            { style: { background: '#f8fafc', border: '1.5px dashed #94a3b8' }, label: 'Assumption 3 - New Joiner' },
            { style: { background: '#fef9c3', border: '1.5px dashed #eab308' }, label: 'Assumption 4 - ISG PE Assessment' },
          ].map(({ style, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[11px] text-[var(--G3)] font-medium">
              <div className="w-6 h-[13px] rounded-[3px]" style={style} />
              {label}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={effectivizeTarget !== null}
        onClose={closeEffectivizeModal}
        title="Hacer efectivo"
        width="420px"
      >
        <p className="text-sm text-[var(--G2)] mb-5">
          Efectivizar bloques de{' '}
          <span className="font-semibold text-[var(--G1)]">{effectivizeTarget?.name}</span>.
        </p>

        {isEffectivizing ? (
          <div className="space-y-5 mb-6">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--G2)]">Periodos</label>
                <span className="text-xs text-[var(--G4)]">
                  {rangeStart === rangeEnd
                    ? periods[rangeStart]?.label
                    : `${periods[rangeStart]?.label} a ${periods[rangeEnd]?.label}`}
                </span>
              </div>
              <div className="flex">
                {periods.map((p, i) => {
                  const inRange = i >= rangeStart && i <= rangeEnd;
                  const isAnchor = rangeAnchor === i;
                  return (
                    <button
                      key={p.label}
                      onClick={() => handlePeriodChipClick(i)}
                      className={[
                        'flex-1 py-1.5 text-xs font-medium transition-colors border-y border-r',
                        'first:border-l first:rounded-l-md last:rounded-r-md',
                        isAnchor
                          ? 'bg-[var(--P)] text-white border-[var(--P)] opacity-70'
                          : inRange
                            ? 'bg-[var(--P)] text-white border-[var(--P)]'
                            : 'bg-white text-[var(--G3)] border-[var(--G5)] hover:text-[var(--G1)] hover:bg-[var(--G6)]',
                      ].join(' ')}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[10px] text-[var(--G4)]">
                {rangeAnchor !== null
                  ? 'Click en otro periodo para completar el rango'
                  : 'Click para seleccionar desde, click de nuevo para hasta'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--G2)] mb-1.5">Cargabilidad %</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className="w-full text-sm border border-[var(--G5)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--P)]"
                  value={effectivizePct}
                  onChange={(ev) => setEffectivizePct(ev.target.value)}
                />
                <span className="text-sm text-[var(--G3)] shrink-0">%</span>
              </div>
            </div>
          </div>
        )}

        {effectivizeError && (
          <p className="text-xs text-[var(--RD)] mb-3">{effectivizeError}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={closeEffectivizeModal} disabled={isEffectivizing}>
            Cancelar
          </Button>
          <Button
            onClick={handleEffectivize}
            disabled={isEffectivizing || effectivizePct === '' || isNaN(parseFloat(effectivizePct))}
          >
            {isEffectivizing ? 'Procesando...' : 'Hacer efectivo'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={chgModal !== null}
        onClose={() => setChgModal(null)}
        title={chgModal?.emp.name}
        width="560px"
      >
        {chgModal && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--G3)] mb-1">
              {chgModal.tickets.length} ticket{chgModal.tickets.length !== 1 ? 's' : ''} asociado{chgModal.tickets.length !== 1 ? 's' : ''}
            </p>
            {chgModal.tickets.map((ticket) => (
              <div key={ticket.id} className="border border-[var(--G5)] rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={typeVariant[ticket.type] ?? 'neutral'}>
                    {TYPE_LABELS[ticket.type] ?? ticket.type}
                  </Badge>
                  <Badge variant={statusVariant[ticket.status] ?? 'neutral'}>
                    {STATUS_LABELS[ticket.status] ?? ticket.status}
                  </Badge>
                  <Badge variant="neutral" className="text-[10px]">
                    {ticket.scenarioType === 'assumption' ? 'Estimacion' : 'Efectivo'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {ticket.clientName && (
                    <>
                      <span className="text-[var(--G3)]">Cliente</span>
                      <span className="text-[var(--G1)] font-medium">{ticket.clientName}</span>
                    </>
                  )}
                  {ticket.chargeabilityPct != null && (
                    <>
                      <span className="text-[var(--G3)]">Cargabilidad</span>
                      <span className="text-[var(--G1)] font-medium">{ticket.chargeabilityPct}%</span>
                    </>
                  )}
                  {ticket.startDate && (
                    <>
                      <span className="text-[var(--G3)]">Inicio</span>
                      <span className="text-[var(--G1)] font-medium">{ticket.startDate}</span>
                    </>
                  )}
                  {ticket.endDate && (
                    <>
                      <span className="text-[var(--G3)]">Fin</span>
                      <span className="text-[var(--G1)] font-medium">{ticket.endDate}</span>
                    </>
                  )}
                </div>
                {(ticket.detail || ticket.comments) && (
                  <p className="text-[11px] text-[var(--G2)] border-t border-[var(--G6)] pt-2">
                    {ticket.detail ?? ticket.comments}
                  </p>
                )}
                <button
                  className="text-[11px] text-[var(--P)] hover:underline mt-1"
                  onClick={() => { router.push(`/tickets/${ticket.id}`); setChgModal(null); }}
                >
                  Ver detalle completo
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}