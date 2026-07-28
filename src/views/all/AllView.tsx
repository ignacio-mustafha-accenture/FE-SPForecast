'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, PencilLine } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Employee } from '@/src/core/domain/employee';
import type { Period } from '@/src/core/domain/period';
import type { Page } from '@/src/core/domain/pagination';
import { HttpChargeabilityBlockRepository } from '@/src/adapters/http/HttpChargeabilityBlockRepository';
import { getClientContainer } from '@/src/application/container';
import { useForecastStore, useAuthStore } from '@/src/store/StoreProvider';
import { useWindowOffset } from '@/src/hooks/useWindowOffset';
import { useDebounce } from '@/src/hooks/useDebounce';
import { FilterBar } from '@/src/components/ui/FilterBar';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { exportToXlsx } from '@/src/lib/excel';

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

const DAY_W = 40; // px — must stay exact for Gantt bar pixel math

const DOW_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const AVATAR_PALETTE = [
  '#7c5cff', '#0ea5b5', '#12a86f', '#e0872a', '#e05c8a', '#5c9ae0', '#c05cc0',
];

type ViewMode = 'weekly' | 'period' | 'monthly';

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

function parseDDMMYY(s: string | null): Date | null {
  if (!s) return null;
  const [d, m, y] = s.split('/').map(Number);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return startOfDay(new Date(2000 + y, m - 1, d));
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

// Build an array of DayCell from startDate to endDate (inclusive)
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

// Group DayCell[] by store periods (no hardcoded splits)
function groupByStorePeriods(cells: DayCell[], periods: Period[], getPIdx: (d: Date) => number): DayGroup[] {
  const groups: DayGroup[] = [];
  let cur: DayGroup | null = null;
  for (const d of cells) {
    const pIdx = getPIdx(d.date);
    const key = pIdx >= 0 ? `p${pIdx}` : `gap-${d.date.getTime()}`;
    const label = pIdx >= 0 ? periods[pIdx].label : '—';
    if (!cur || cur.key !== key) { cur = { key, label, count: 0 }; groups.push(cur); }
    cur.count++;
  }
  return groups;
}

// ─── component ───────────────────────────────────────────────────────────────

export function AllView() {
  const t = useTranslations('all');
  const searchParams = useSearchParams();
  const router = useRouter();

  const periods = useForecastStore((s) => s.appState?.periods ?? []);
  const fetchState = useForecastStore((s) => s.fetchState);
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const { offset: windowOffset } = useWindowOffset();

  // ── BE pagination state ──────────────────────────────────────────────────
  const [result, setResult] = useState<Page<Employee> | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── efectivizar modal state ──────────────────────────────────────────────
  const [effectivizeTarget, setEffectivizeTarget] = useState<{ eid: string; name: string } | null>(null);
  const [effectivizePct, setEffectivizePct] = useState('');
  const [isEffectivizing, setIsEffectivizing] = useState(false);
  const [effectivizeError, setEffectivizeError] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(0);
  const [rangeAnchor, setRangeAnchor] = useState<number | null>(null);

  // ── URL filters ──────────────────────────────────────────────────────────
  const q = searchParams.get('q') ?? '';
  const country = searchParams.get('country') ?? '';
  const status = searchParams.get('status') ?? '';
  const chgType = (searchParams.get('chg') === 'SL' ? 'SL' : 'HL') as 'HL' | 'SL';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10));
  const debouncedQ = useDebounce(q, 300);

  // ── fetch from BE ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setIsFetching(true);
    getClientContainer()
      .listEmployees.execute({ country: country || undefined, q: debouncedQ || undefined, status: status || undefined, page, pageSize })
      .then((data) => { if (!cancelled) setResult(data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setIsFetching(false); });
    return () => { cancelled = true; };
  }, [country, debouncedQ, status, page, pageSize, refreshKey]);

  // ── view state ───────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('period');
  // windowAnchor is any date inside the desired window; derivations snap it to proper boundaries
  const [windowAnchor, setWindowAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // ── period index lookup ──────────────────────────────────────────────────
  const getPeriodIdx = useCallback(
    (date: Date): number => {
      for (let i = 0; i < periods.length; i++) {
        if (date >= startOfDay(new Date(periods[i].startDate)) && date <= endOfDay(new Date(periods[i].endDate))) return i;
      }
      return -1;
    },
    [periods],
  );

  // ── derive days, groups, window edges from viewMode + anchor ────────────
  const { days, dayGroups, windowStart, windowEnd, toolbarLabel, canPrev, canNext } = useMemo(() => {
    const today = startOfDay(new Date());

    // ── weekly ──────────────────────────────────────────────────────────
    if (viewMode === 'weekly') {
      const dow = windowAnchor.getDay();
      const monday = new Date(windowAnchor);
      monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
      startOfDay(monday);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      const cells = cellsInRange(monday, sunday);
      const wStart = cells[0].date;
      const wEnd = endOfDay(cells[cells.length - 1].date);
      const groups = groupByStorePeriods(cells, periods, getPeriodIdx);

      const fmt = (d: Date) => d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
      const label = `${fmt(monday)} – ${fmt(sunday)}`;

      return { days: cells, dayGroups: groups, windowStart: wStart, windowEnd: wEnd, toolbarLabel: label, canPrev: true, canNext: true };
    }

    // ── monthly: show P1 + P2 from store (never mix calendar months) ─────
    if (viewMode === 'monthly') {
      if (periods.length === 0) {
        const cells = cellsInRange(today, new Date(today.getTime() + 29 * 86_400_000));
        return { days: cells, dayGroups: [{ key: 'loading', label: '…', count: cells.length }], windowStart: today, windowEnd: endOfDay(cells[cells.length - 1].date), toolbarLabel: '—', canPrev: false, canNext: false };
      }
      const pIdx = getPeriodIdx(windowAnchor);
      const safePIdx = pIdx >= 0 ? pIdx : 0;
      const isP2 = periods[safePIdx]?.label?.toUpperCase().includes('P2') ?? false;
      const p1Idx = isP2 ? Math.max(0, safePIdx - 1) : safePIdx;
      const p2Idx = Math.min(periods.length - 1, p1Idx + 1);
      const p1 = periods[p1Idx];
      const p2 = periods[p2Idx];

      const cells1 = cellsInRange(new Date(p1.startDate), new Date(p1.endDate));
      const cells2 = p2Idx !== p1Idx ? cellsInRange(new Date(p2.startDate), new Date(p2.endDate)) : [];
      const cells = [...cells1, ...cells2.map(c => ({ ...c, idx: cells1.length + c.idx }))];

      const wStart = startOfDay(new Date(p1.startDate));
      const wEnd = endOfDay(new Date(p2.endDate));
      const groups: DayGroup[] = [{ key: p1.label, label: p1.label, count: cells1.length }];
      if (p2Idx !== p1Idx) groups.push({ key: p2.label, label: p2.label, count: cells2.length });

      const label = wStart.toLocaleDateString('es', { month: 'long', year: 'numeric' });
      return { days: cells, dayGroups: groups, windowStart: wStart, windowEnd: wEnd, toolbarLabel: label, canPrev: p1Idx > 0, canNext: p2Idx < periods.length - 1 };
    }

    // ── period (default) ─────────────────────────────────────────────────
    if (periods.length === 0) {
      // Fallback while store loads
      const cells = cellsInRange(today, new Date(today.getTime() + 13 * 86_400_000));
      return {
        days: cells,
        dayGroups: [{ key: 'loading', label: '…', count: cells.length }],
        windowStart: today,
        windowEnd: endOfDay(cells[cells.length - 1].date),
        toolbarLabel: '—',
        canPrev: false,
        canNext: false,
      };
    }

    const pIdx = getPeriodIdx(windowAnchor);
    const safePIdx = pIdx >= 0 ? pIdx : 0;
    const p = periods[safePIdx];
    const cells = cellsInRange(new Date(p.startDate), new Date(p.endDate));
    const wStart = startOfDay(new Date(p.startDate));
    const wEnd = endOfDay(new Date(p.endDate));

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
    };
  }, [viewMode, windowAnchor, periods, getPeriodIdx]);

  const nDays = days.length;
  // weekly gets wider columns so 7 days fill the viewport; period/monthly stay at 40px
  const colW = viewMode === 'weekly' ? 120 : DAY_W;

  // ── navigation ───────────────────────────────────────────────────────────
  function navigate(dir: number) {
    setWindowAnchor((prev) => {
      if (viewMode === 'weekly') {
        const d = new Date(prev);
        d.setDate(d.getDate() + dir * 7);
        return d;
      }
      if (viewMode === 'monthly') {
        const pIdx = getPeriodIdx(prev);
        const safePIdx = pIdx >= 0 ? pIdx : 0;
        const isP2 = periods[safePIdx]?.label?.toUpperCase().includes('P2') ?? false;
        const p1Idx = isP2 ? Math.max(0, safePIdx - 1) : safePIdx;
        const p2Idx = Math.min(periods.length - 1, p1Idx + 1);
        const targetIdx = dir > 0
          ? Math.min(periods.length - 1, p2Idx + 1)   // jump to next P1
          : Math.max(0, p1Idx - 2);                    // jump to prev P1
        return startOfDay(new Date(periods[targetIdx].startDate));
      }
      // period: jump to adjacent period start
      const pIdx = getPeriodIdx(prev);
      const safePIdx = pIdx >= 0 ? pIdx : 0;
      const targetIdx = Math.max(0, Math.min(periods.length - 1, safePIdx + dir));
      return startOfDay(new Date(periods[targetIdx].startDate));
    });
  }

  // ── derived from BE result ───────────────────────────────────────────────
  const activeCountries = useMemo(() => (country ? country.split(',') : []), [country]);
  const paged = result?.items ?? [];
  const pageCount = result?.pages ?? 1;
  const safePage = result?.page ?? page;

  // ── efectivizar ──────────────────────────────────────────────────────────
  function openEffectivizeModal(emp: Employee) {
    // Find the first period with an active SL
    const firstIdx = emp.slAssumed.findIndex((v) => (v ?? 0) > 0);
    const safeStart = firstIdx >= 0 ? firstIdx : 0;

    // Extend range while consecutive periods still have SL > 0
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
      await blockRepo.effectivize(effectivizeTarget.eid, selectedPeriodNames, pct);
      await fetchState(windowOffset);
      setRefreshKey((k) => k + 1);
      setEffectivizeTarget(null);
    } catch (err) {
      setEffectivizeError(err instanceof Error ? err.message : 'Error al efectivizar');
    } finally {
      setIsEffectivizing(false);
    }
  }

  // ── param helpers ────────────────────────────────────────────────────────
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
    { value: 'green',      label: t('statusChargeable') },
    { value: 'yellow',     label: t('statusAtRisk') },
    { value: 'red',        label: t('statusNotChargeable') },
    { value: 'unassigned', label: t('statusUnassigned') },
  ];

  // ── loading ──────────────────────────────────────────────────────────────
  if (isFetching && !result) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-[420px] rounded-xl" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ── toolbar ───────────────────────────────────────────────────── */}
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

        {/* view mode toggle */}
        <div className="flex border border-[var(--G5)] rounded-lg overflow-hidden bg-white">
          {([
            { key: 'weekly',  label: 'Semanal'  },
            { key: 'period',  label: 'Período'  },
            { key: 'monthly', label: 'Mensual'  },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === key
                  ? 'bg-[var(--P)] text-white'
                  : 'text-[var(--G3)] hover:text-[var(--G1)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* HL / SL toggle */}
        <div className="flex border border-[var(--G5)] rounded-lg overflow-hidden bg-white">
          {(['HL', 'SL'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setParam('chg', mode)}
              className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                chgType === mode
                  ? 'bg-[var(--P)] text-white'
                  : 'text-[var(--G3)] hover:text-[var(--G1)]'
              }`}
            >
              {t(mode === 'HL' ? 'toggleHL' : 'toggleSL')}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={handleExport}>
          {t('exportBtn')}
        </Button>
      </div>

      {/* ── filters ───────────────────────────────────────────────────── */}
      <FilterBar
        search={{ value: q, onChange: (v) => setParam('q', v), placeholder: t('searchPlaceholder') }}
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
        ]}
      />

      <p className="text-xs text-[var(--G3)]">{t('countEmployees', { count: result?.total ?? 0 })}</p>

      {/* ── grid ──────────────────────────────────────────────────────── */}
      <div className={`overflow-x-auto border border-[var(--G5)] rounded-xl bg-white shadow-[0_1px_3px_rgba(20,25,40,.04)] transition-opacity duration-200 ${isFetching ? 'opacity-60 pointer-events-none' : ''}`}>
        <table
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
            width: '100%',
            minWidth: 172 + nDays * colW,
          }}
        >
          <colgroup>
            <col />
            {days.map((d) => <col key={d.idx} style={{ width: colW }} />)}
          </colgroup>

          <thead>
            {/* period group row */}
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
            </tr>

            {/* day number + dow */}
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
            </tr>
          </thead>

          <motion.tbody
            key={`${safePage}-${debouncedQ}-${status}-${country}-${windowStart.getTime()}-${viewMode}-${refreshKey}`}
            initial="hidden"
            animate="visible"
            variants={TBODY_VARIANTS}
          >
            {paged.length === 0 ? (
              <tr>
                <td colSpan={nDays + 1} className="text-center text-sm text-[var(--G3)] py-12">
                  Sin empleados
                </td>
              </tr>
            ) : (
              paged.flatMap((emp) => {
                const isExpanded = !!expanded[emp.id];
                const sahDay = Math.round((emp.totalHours || 80) / 10);
                const rollOnDate  = parseDDMMYY(emp.rollOn);
                const rollOffDate = parseDDMMYY(emp.rollOff);

                return [
                  /* person row */
                  <motion.tr key={emp.id} variants={ROW_VARIANTS} className="group cursor-pointer select-none" onClick={() => toggleExpand(emp.id)}>
                      <td className="sticky left-0 z-10 bg-[#fafbfc] border-b border-r border-[var(--G5)] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background: avatarColor(emp.id) }}
                          >
                            {getInitials(emp.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-[var(--G1)] truncate">{emp.name}</div>
                            <div className="text-[9px] text-[var(--G4)] font-medium">{sahDay}h/día · {emp.country}</div>
                          </div>
                          {isAdmin && emp.scenarioType === 'assumption' && (
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
                        const pIdx = getPeriodIdx(d.date);
                        const hlPct = pIdx >= 0 ? (emp.cp[pIdx]        ?? 0) : null;
                        const slPct = pIdx >= 0 ? (emp.slAssumed[pIdx] ?? 0) : null;
                        const shown = chgType === 'HL' ? hlPct : slPct;
                        const sub   = chgType === 'HL' ? slPct : hlPct;
                        return (
                          <td
                            key={d.idx}
                            className={`border-b border-r border-[var(--G5)] last:border-r-0 text-center align-middle h-[34px] ${d.weekend ? 'bg-white' : 'bg-[#fafbfc]'}`}
                            style={{ padding: 0 }}
                          >
                            {shown === null ? (
                              <span className="text-[11px] text-[var(--G4)]">—</span>
                            ) : (
                              <>
                                <span
                                  className={`block text-[12px] font-semibold leading-tight ${
                                    shown >= 80 ? 'text-[var(--GR)]' : shown >= 50 ? 'text-[var(--YL)]' : 'text-[var(--RD)]'
                                  }`}
                                >
                                  {shown}%
                                </span>
                                {sub !== null && (
                                  <span className="block text-[9px] text-[var(--G4)] font-medium leading-tight">
                                    {chgType === 'HL' ? 'SL' : 'HL'} {sub}%
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                        );
                      })}
                  </motion.tr>,

                  /* expanded: Gantt bar row */
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
                          {emp.client ?? '—'}
                          <span className="ml-1 text-[9px] text-[var(--G4)]">
                            ({emp.scenarioType === 'effective' ? 'HL' : 'SL'})
                          </span>
                        </td>
                        <td
                          colSpan={nDays}
                          className="border-b border-[var(--G5)] bg-white"
                          style={{ position: 'relative', height: 32, padding: 0 }}
                        >
                          {rollOnDate && rollOffDate && (() => {
                            const barStart = rollOnDate < windowStart ? windowStart : rollOnDate;
                            const barEnd   = rollOffDate > windowEnd  ? windowEnd  : rollOffDate;
                            if (barStart > windowEnd || barEnd < windowStart) return null;

                            const leftDays  = Math.round((barStart.getTime() - windowStart.getTime()) / 86_400_000);
                            const widthDays = Math.round((barEnd.getTime() - barStart.getTime()) / 86_400_000) + 1;
                            const isHL      = emp.scenarioType === 'effective';
                            const pctIdx    = getPeriodIdx(barStart);
                            const pct       = isHL
                              ? (emp.cp[pctIdx >= 0 ? pctIdx : 0] ?? 0)
                              : (emp.slAssumed[pctIdx >= 0 ? pctIdx : 0] ?? 0);

                            return (
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
                            );
                          })()}
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>,

                  /* chart row: mini bar chart per period */
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
                      </motion.tr>
                    )}
                  </AnimatePresence>,
                ];
              })
            )}
          </motion.tbody>
        </table>
      </div>

      {/* ── legend ────────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-wrap items-center pt-1">
        {[
          { style: { background: '#e8effc', border: '1.5px solid #5b8def' },     label: 'Hard Lock (efectivo)' },
          { style: { background: 'transparent', border: '1.5px dashed #8aa4d6' }, label: 'Soft Lock (supuesto)' },
        ].map(({ style, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[11px] text-[var(--G3)] font-medium">
            <div className="w-6 h-[13px] rounded-[3px]" style={style} />
            {label}
          </div>
        ))}
      </div>

      {/* ── pagination ────────────────────────────────────────────────── */}
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
      {/* ── efectivizar modal ─────────────────────────────────────────── */}
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
    </div>
  );
}
