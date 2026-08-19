'use client';

import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from 'react';
import { useToast } from '@/src/hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, PencilLine, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Employee } from '@/src/core/domain/employee';
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
import { parseDDMMYY } from '@/src/lib/formatters';

const blockRepo = new HttpChargeabilityBlockRepository();

// ─── animation variants ───────────────────────────────────────────────────────

const TBODY_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
};

const ROW_VARIANTS = {
  hidden: { opacity: 0, y: -7 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

// ─── constants ────────────────────────────────────────────────────────────────

const DAY_W = 40;
const SUMMARY_W = 60;

const DOW_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const AVATAR_PALETTE = [
  '#7c5cff', '#0ea5b5', '#12a86f', '#e0872a', '#e05c8a', '#5c9ae0', '#c05cc0',
];

// ─── ticket modal constants ───────────────────────────────────────────────────

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

// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── component ───────────────────────────────────────────────────────────────

export function AllView() {
  const t = useTranslations('all');
  const toast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const periods = useForecastStore((s) => s.appState?.periods ?? []);
  const storeEmps = useForecastStore((s) => s.appState?.employees ?? []);
  const allTickets = useForecastStore((s) => s.appState?.tickets ?? []);
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

  // ── BE pagination state ──────────────────────────────────────────────────
  const [result, setResult] = useState<Page<Employee> | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── efectivizar modal state ──────────────────────────────────────────────
  const [effectivizeTarget, setEffectivizeTarget] = useState<{ eid: string; name: string } | null>(null);

  // ── CHG% tickets modal state ─────────────────────────────────────────────
  const [chgModal, setChgModal] = useState<{ emp: Employee; tickets: Ticket[] } | null>(null);
  const [effectivizePct, setEffectivizePct] = useState('');
  const [isEffectivizing, setIsEffectivizing] = useState(false);
  const [effectivizeError, setEffectivizeError] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(0);
  const [rangeAnchor, setRangeAnchor] = useState<number | null>(null);
  const [holidays, setHolidays] = useState<Map<string, Map<string, string>>>(new Map());

  const q = searchParams.get('q') ?? '';
  const country = searchParams.get('country') ?? '';
  const status = searchParams.get('status') ?? '';
  const offering = searchParams.get('offering') ?? '';
  const teApprover = searchParams.get('te_approver') ?? '';
  const chgBucket = searchParams.get('chg_bucket') ?? '';
  const chgType = (searchParams.get('chg') === 'SL' ? 'SL' : 'HL') as 'HL' | 'SL';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10));

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
    p.delete('page');
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [debouncedQ]); 

  useEffect(() => {
    fetch('/api/te-approvers', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setTeApprovers(d.items ?? []))
      .catch(() => { });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsFetching(true);
    getClientContainer()
      .listEmployees.execute({
        country: country || undefined,
        q: debouncedQ || undefined,
        status: status || undefined,
        page,
        pageSize,
        offering: offering || undefined,
        teApprover: teApprover || undefined,
        chgBucket: chgBucket || undefined,
      })
      .then((data) => { if (!cancelled) setResult(data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) { setIsFetching(false); setIsRefetching(false); } });
    return () => { cancelled = true; };
  }, [country, debouncedQ, status, offering, teApprover, chgBucket, page, pageSize, refreshKey]);

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
  const [viewMode, setViewMode] = useState<'daily' | 'forecast'>('daily');

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
        dayGroups: [{ key: 'loading', label: '…', count: cells.length }],
        windowStart: today,
        windowEnd: endOfDay(cells[cells.length - 1].date),
        toolbarLabel: '—',
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
    const label = `${p.label} · ${fmt(first.date)} – ${fmt(last.date)}`;

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
    setWindowAnchor((prev) => {
      const pIdx = getPeriodIdx(prev);
      const safePIdx = pIdx >= 0 ? pIdx : 0;
      const targetIdx = Math.max(0, Math.min(periods.length - 1, safePIdx + dir));
      return startOfDay(parseLocalDate(periods[targetIdx].startDate));
    });
  }

  const activeCountries = useMemo(() => (country ? country.split(',') : []), [country]);

  const paged = useMemo(() => {
    const items = result?.items ?? [];
    const enriched = items.map((e) => {
      const s = storeEmpMap.get(e.id);
      if (!s || s.cp.length <= 1) return e;
      return {
        ...e,
        cp: s.cp,
        slAssumed: s.slAssumed,
        hl: s.hl,
        chg: s.chg,
        sah: s.sah,
        chgEffective: s.chgEffective,
        chgAssumption: s.chgAssumption,
        ppaAdj: s.ppaAdj,
        slReal: s.slReal,
      };
    });
    return enriched;
  }, [result?.items, storeEmpMap]);

  const pageCount = result?.pages ?? 1;
  const safePage = result?.page ?? page;

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
    p.delete('page');
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
    const rows = paged.map((e) => ({
      EID: e.id,
      Nombre: e.name,
      País: e.country,
      CL: e.level,
      Cliente: e.client ?? '',
      'Roll On': e.rollOn ?? '',
      'Roll Off': e.rollOff ?? '',
      ...Object.fromEntries(periods.map((p, i) => [`CHG% HL ${p.label}`, e.cp[i] ?? 0])),
      ...Object.fromEntries(periods.map((p, i) => [`CHG% SL ${p.label}`, e.slAssumed[i] ?? 0])),
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
    { value: 'Tech-led', label: 'Tech-led' },
    { value: 'Cost Take Out', label: 'Cost Take Out' },
    { value: 'OM+SPY+Others', label: 'OM+SPY+Others' },
    { value: 'Internal', label: 'Internal' },
    { value: 'CTO', label: 'CTO' },
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
          disabled={!canPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--G5)] bg-white text-[var(--G3)] hover:bg-[var(--G6)] hover:text-[var(--G1)] disabled:opacity-40 transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          onClick={() => navigate(1)}
          disabled={!canNext}
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
          {(['HL', 'SL'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setParam('chg', mode)}
              className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${chgType === mode
                ? 'bg-[var(--P)] text-white'
                : 'text-[var(--G3)] hover:text-[var(--G1)]'
                }`}
            >
              {t(mode === 'HL' ? 'toggleHL' : 'toggleSL')}
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
            label: t('filterStatus'),
            options: STATUS_OPTIONS,
            active: status ? [status] : [],
            onToggle: (v) => setParam('status', status === v ? '' : v),
          },
          {
            label: 'Proyecto',
            options: OFFERING_OPTIONS,
            active: offering ? [offering] : [],
            onToggle: (v) => setParam('offering', offering === v ? '' : v),
          },
          {
            label: 'CHG%',
            options: CHG_BUCKET_OPTIONS,
            active: chgBucket ? [chgBucket] : [],
            onToggle: (v) => setParam('chg_bucket', chgBucket === v ? '' : v),
          },
        ]}
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
              <ul className="absolute z-10 left-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto min-w-[180px] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--G5)]">
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

        <div className={`overflow-x-auto border border-[var(--G5)] rounded-xl bg-white shadow-[0_1px_3px_rgba(20,25,40,.04)] transition-opacity duration-200 ${isFetching ? 'opacity-60 pointer-events-none' : ''}`}>
          <table
            style={{
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'fixed',
              minWidth: 200 + periods.length * 170,
            }}
          >
            <colgroup>
              <col style={{ width: 200 }} />
              {periods.flatMap((_, i) => [
                <col key={`fc-chg-${i}`} style={{ width: 55 }} />,
                <col key={`fc-sah-${i}`} style={{ width: 55 }} />,
                <col key={`fc-pct-${i}`} style={{ width: 60 }} />,
              ])}
            </colgroup>
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-[#f4f6f9] text-left px-3 py-2 text-[11px] font-semibold text-[var(--G3)] tracking-wide border-b border-r border-[var(--G5)] whitespace-nowrap">
                  {t('title')}
                </th>
                {periods.map((p, i) => (
                  <th
                    key={p.label}
                    colSpan={3}
                    className={`text-center text-[11px] font-semibold py-2 px-1 tracking-wide border-b border-r border-[var(--G5)] last:border-r-0 ${i === currentPIdx ? 'bg-[#e8effc] text-[#2f5bb7]' : 'bg-[#f4f6f9] text-[var(--G3)]'
                      }`}
                  >
                    {p.label}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-20 bg-[#f4f6f9] border-b border-r border-[var(--G5)]" />
                {periods.map((p, i) => (
                  <Fragment key={p.label}>
                    <th className={`text-center text-[10px] font-semibold text-[var(--G3)] py-1 border-b border-r border-[var(--G5)] ${i === currentPIdx ? 'bg-[#e8effc]' : 'bg-[#f4f6f9]'}`}>CHG</th>
                    <th className={`text-center text-[10px] font-semibold text-[var(--G3)] py-1 border-b border-r border-[var(--G5)] ${i === currentPIdx ? 'bg-[#dce8fc]' : 'bg-[#f4f6f9]'}`}>SAH</th>
                    <th className={`text-center text-[10px] font-semibold text-[var(--G3)] py-1 border-b border-r border-[var(--G5)] last:border-r-0 ${i === currentPIdx ? 'bg-[#e8effc]' : 'bg-[#f4f6f9]'}`}>CHG%</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="sticky left-0 z-10 bg-[#f0f2f7] border-b border-r border-[var(--G5)] px-3 py-2">
                  <span className="text-[11px] font-semibold text-[var(--G1)]">Total</span>
                  <span className="block text-[9px] text-[var(--G3)]">{paged.length} empleados</span>
                </td>
                {periods.map((_, i) => {
                  const totalSah = paged.reduce((s, e) => s + (e.sah[i] ?? 0), 0);
                  const totalChg = paged.reduce((s, e) => {
                    const p = chgType === 'HL' ? (e.cp[i] ?? 0) : (e.slAssumed[i] ?? 0);
                    return s + Math.round((e.sah[i] ?? 0) * p / 100);
                  }, 0);
                  const avgPct = totalSah > 0 ? Math.round(totalChg / totalSah * 100) : 0;
                  const sumColor = avgPct >= 80 ? 'text-[var(--GR)]' : avgPct >= 50 ? 'text-[var(--YL)]' : 'text-[var(--RD)]';
                  const isCur = i === currentPIdx;
                  return (
                    <Fragment key={i}>
                      <td className={`border-b border-r border-[var(--G5)] text-center h-[34px] ${isCur ? 'bg-[#e0e8f8]' : 'bg-[#f0f2f7]'}`} style={{ padding: 0 }}>
                        <span className="text-[11px] font-semibold text-[var(--G1)]">{totalChg}</span>
                      </td>
                      <td className={`border-b border-r border-[var(--G5)] text-center h-[34px] ${isCur ? 'bg-[#c8d8f4]' : 'bg-[#e8effc]'}`} style={{ padding: 0 }}>
                        <span className="text-[11px] font-semibold text-[#2f5bb7]">{Math.round(totalSah)}</span>
                      </td>
                      <td className={`border-b border-r border-[var(--G5)] text-center h-[34px] ${isCur ? 'bg-[#e0e8f8]' : 'bg-[#f0f2f7]'} last:border-r-0`} style={{ padding: 0 }}>
                        <span className={`text-[11px] font-semibold ${sumColor}`}>{avgPct}%</span>
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={1 + periods.length * 3} className="text-center text-sm text-[var(--G3)] py-12">
                    Sin empleados
                  </td>
                </tr>
              ) : paged.map((emp) => {
                const fRollOn = parseDDMMYY(emp.rollOn);
                const fRollOff = parseDDMMYY(emp.rollOff);
                const fPtoStart = parseDDMMYY(emp.nextPTO);
                const fPtoEnd = parseDDMMYY(emp.nextPTOEnd);
                const fSick = sickRangesMap.get(emp.id) ?? [];
                return (
                  <tr key={emp.id} className="group">
                    <td className="sticky left-0 z-10 bg-[#fafbfc] border-b border-r border-[var(--G5)] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: avatarColor(emp.id) }}
                        >
                          {getInitials(emp.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-xs font-semibold text-[var(--G1)] truncate">{emp.name}</span>
                          <span className="block text-[9px] text-[var(--G4)]">{emp.level} · {emp.country}</span>
                        </div>
                      </div>
                    </td>
                    {periods.map((period, i) => {
                      const sah = emp.sah[i] ?? 0;
                      const p = chgType === 'HL' ? (emp.cp[i] ?? 0) : (emp.slAssumed[i] ?? 0);
                      const periodDays = cellsInRange(parseLocalDate(period.startDate), parseLocalDate(period.endDate));
                      const chgDayCount = periodDays.filter((d) => {
                        if (d.weekend) return false;
                        if (chgType === 'HL') {
                          if (fRollOn !== null && d.date < fRollOn) return false;
                          if (fRollOff !== null && d.date > fRollOff) return false;
                        }
                        if (fPtoStart !== null && fPtoEnd !== null && d.date >= fPtoStart && d.date <= fPtoEnd) return false;
                        if (fSick.some((r) => d.date >= r.start && d.date <= r.end)) return false;
                        if (isHoliday(d.date, emp.country)) return false;
                        return true;
                      }).length;
                      const totalCHGVal = chgDayCount * 8 * p / 100;
                      const chgLabel = totalCHGVal % 1 === 0 ? `${Math.round(totalCHGVal)}` : totalCHGVal.toFixed(1);
                      const cellColor = p >= 80 ? 'text-[var(--GR)]' : p >= 50 ? 'text-[var(--YL)]' : 'text-[var(--RD)]';
                      const isCur = i === currentPIdx;
                      return (
                        <Fragment key={i}>
                          <td className={`border-b border-r border-[var(--G5)] text-center h-[34px] ${isCur ? 'bg-[#f0f5ff]' : 'bg-white'}`} style={{ padding: 0 }}>
                            <span className={`text-[11px] font-semibold ${cellColor}`}>{chgLabel}</span>
                          </td>
                          <td className={`border-b border-r border-[var(--G5)] text-center h-[34px] ${isCur ? 'bg-[#e4edfc]' : 'bg-[#f4f8ff]'}`} style={{ padding: 0 }}>
                            <span className="text-[11px] font-semibold text-[#4a72c4]">{Math.round(sah)}</span>
                          </td>
                          {(() => {
                            const isClickable = p !== 100 && employeeIdsWithTickets.has(emp.id);
                            return (
                              <td
                                className={`border-b border-r border-[var(--G5)] text-center h-[34px] last:border-r-0 ${isCur ? 'bg-[#f0f5ff]' : 'bg-white'} ${isClickable ? 'cursor-pointer hover:brightness-95' : ''}`}
                                style={{ padding: 0 }}
                                onClick={isClickable ? () => {
                                  const empTickets = allTickets.filter((t) => t.employeeId === emp.id);
                                  setChgModal({ emp, tickets: empTickets });
                                } : undefined}
                              >
                                <span className={`text-[11px] font-semibold ${cellColor}`}>
                                  {p}%
                                  {isClickable && <span className="ml-0.5 text-[9px] opacity-50">ⓘ</span>}
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
                  {t('title')}
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
                <th className="bg-[#f4f6f9] text-center text-[10px] font-semibold text-[var(--G3)] py-1 border-b border-l border-[var(--G5)]">CHG%</th>
              </tr>
            </thead>

            <motion.tbody
              key={`${safePage}-${debouncedQ}-${status}-${country}-${offering}-${teApprover}-${chgBucket}-${windowStart.getTime()}-${refreshKey}`}
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
                paged.flatMap((emp) => {
                  const isExpanded = !!expanded[emp.id];
                  const pIdx = currentPIdx;
                  const sahForPeriod = emp.sah?.[pIdx] ?? emp.totalHours ?? 80;
                  const dailySAH = 8;
                  const sahDay = Math.round(dailySAH);
                  const rollOnDate = parseDDMMYY(emp.rollOn);
                  const rollOffDate = parseDDMMYY(emp.rollOff);
                  const ptoStart = parseDDMMYY(emp.nextPTO);
                  const ptoEnd = parseDDMMYY(emp.nextPTOEnd);

                  const chgPct = chgType === 'HL' ? (emp.cp[pIdx] ?? 0) : (emp.slAssumed[pIdx] ?? 0);
                  const dailyCHG = 8 * chgPct / 100;
                  const dailyCHGLabel = dailyCHG % 1 === 0 ? `${dailyCHG}h` : `${dailyCHG.toFixed(1)}h`;
                  const chgDays = days.filter((d) => {
                    if (d.weekend) return false;
                    if (chgType === 'HL') {
                      if (rollOnDate !== null && d.date < rollOnDate) return false;
                      if (rollOffDate !== null && d.date > rollOffDate) return false;
                    }
                    if (ptoStart !== null && ptoEnd !== null && d.date >= ptoStart && d.date <= ptoEnd) return false;
                    const sick = sickRangesMap.get(emp.id) ?? [];
                    if (sick.some((r) => d.date >= r.start && d.date <= r.end)) return false;
                    if (isHoliday(d.date, emp.country)) return false;
                    return true;
                  }).length;
                  const totalCHGVal = chgDays * dailyCHG;
                  const totalCHGLabel = totalCHGVal % 1 === 0 ? `${totalCHGVal}h` : `${totalCHGVal.toFixed(1)}h`;
                  const realChgPct = sahForPeriod > 0 ? Math.round(totalCHGVal / sahForPeriod * 100) : 0;
                  const summaryColor = realChgPct >= 80 ? 'text-[var(--GR)]' : realChgPct >= 50 ? 'text-[var(--YL)]' : 'text-[var(--RD)]';

                  return [
                    <motion.tr key={emp.id} variants={ROW_VARIANTS} className={`group cursor-pointer select-none${emp.isOnPTO ? ' opacity-50' : ''}`} onClick={() => toggleExpand(emp.id)}>
                      <td className="sticky left-0 z-10 bg-[#fafbfc] border-b border-r border-[var(--G5)] px-3 py-2">
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
                                  title={emp.nextPTO && emp.nextPTOEnd ? `En vacaciones: ${emp.nextPTO} – ${emp.nextPTOEnd}` : 'En vacaciones'}
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 cursor-default select-none flex-shrink-0"
                                >
                                  PTO
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-[var(--G4)] font-medium">{sahDay}h/día · {emp.country}</div>
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
                            className={`border-b border-r border-[var(--G5)] last:border-r-0 text-center align-middle h-[34px] ${d.weekend ? 'bg-white' : holidayName ? 'bg-[#efefef]' : isOutOfRange ? 'bg-[#f7f7f7]' : effectivePto ? 'bg-amber-50' : isSickDay ? 'bg-blue-50' : 'bg-[#fafbfc]'
                              }`}
                            style={{ padding: 0 }}
                          >
                            {holidayName && !d.weekend ? (
                              <span className="text-[13px] leading-none" title={holidayName}>🌴</span>
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
                        <span className="text-[11px] font-semibold text-[#4a72c4]">{Math.round(sahForPeriod)}h</span>
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
                                {emp.client ?? '—'}
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

                                const ptoStart = parseDDMMYY(emp.nextPTO);
                                const ptoEnd = parseDDMMYY(emp.nextPTOEnd);
                                const ptoBar = ptoStart && ptoEnd ? (() => {
                                  const ps = ptoStart < windowStart ? windowStart : ptoStart;
                                  const pe = ptoEnd > windowEnd ? windowEnd : ptoEnd;
                                  if (ps > windowEnd || pe < windowStart) return null;
                                  const ptoLeft = Math.round((ps.getTime() - windowStart.getTime()) / 86_400_000);
                                  const ptoWidth = Math.round((pe.getTime() - ps.getTime()) / 86_400_000) + 1;
                                  return (
                                    <div
                                      title={`Vacaciones: ${emp.nextPTO} – ${emp.nextPTOEnd}`}
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
                                      🏖 PTO
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
                                        ...(isHL
                                          ? { background: '#e8effc', color: '#2f5bb7', border: '1.5px solid #5b8def' }
                                          : { background: 'transparent', color: '#5a6ea3', border: '1.5px dashed #8aa4d6' }),
                                      }}
                                    >
                                      {pct}% · {emp.client ?? 'Sin proyecto'}
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
                              Ver detalle →
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

      {viewMode === 'daily' && (
        <div className="flex gap-4 flex-wrap items-center pt-1">
          {[
            { style: { background: '#e8effc', border: '1.5px solid #5b8def' }, label: 'Hard Lock (efectivo)' },
            { style: { background: 'transparent', border: '1.5px dashed #8aa4d6' }, label: 'Soft Lock (supuesto)' },
          ].map(({ style, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[11px] text-[var(--G3)] font-medium">
              <div className="w-6 h-[13px] rounded-[3px]" style={style} />
              {label}
            </div>
          ))}
        </div>
      )}

      {(result?.total ?? 0) > 0 && (
        <div className={`flex items-center px-1 text-sm text-[var(--G2)] ${pageCount > 1 ? 'justify-between' : 'justify-end'}`}>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const p = new URLSearchParams(searchParams.toString());
                  safePage > 1 ? p.set('page', String(safePage - 1)) : p.delete('page');
                  router.replace(`?${p.toString()}`, { scroll: false });
                }}
                disabled={safePage <= 1}
                className="px-2.5 py-1 rounded border border-[var(--G5)] disabled:opacity-40 hover:enabled:bg-[var(--G6)] transition-colors"
              >
                ← Anterior
              </button>
              <span className="whitespace-nowrap">
                Página {safePage} de {pageCount}
                <span className="text-[var(--G3)] ml-1">({result?.total ?? 0} resultados)</span>
              </span>
              <button
                onClick={() => {
                  const p = new URLSearchParams(searchParams.toString());
                  p.set('page', String(safePage + 1));
                  router.replace(`?${p.toString()}`, { scroll: false });
                }}
                disabled={safePage >= pageCount}
                className="px-2.5 py-1 rounded border border-[var(--G5)] disabled:opacity-40 hover:enabled:bg-[var(--G6)] transition-colors"
              >
                Siguiente →
              </button>
            </div>
          )}
          <select
            value={pageSize}
            onChange={(e) => {
              const p = new URLSearchParams(searchParams.toString());
              p.set('pageSize', e.target.value);
              p.delete('page');
              router.replace(`?${p.toString()}`, { scroll: false });
            }}
            className="border border-[var(--G5)] rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-[var(--P)]"
          >
            {[10, 25, 50, 100].map((s) => (
              <option key={s} value={s}>{s} por página</option>
            ))}
          </select>
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
                <label className="text-xs font-medium text-[var(--G2)]">Períodos</label>
                <span className="text-xs text-[var(--G4)]">
                  {rangeStart === rangeEnd
                    ? periods[rangeStart]?.label
                    : `${periods[rangeStart]?.label} → ${periods[rangeEnd]?.label}`}
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
                  ? 'Click en otro período para completar el rango'
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
            {isEffectivizing ? 'Procesando…' : 'Hacer efectivo'}
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
                    {ticket.scenarioType === 'assumption' ? 'Estimación' : 'Efectivo'}
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
                  Ver detalle completo →
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
