'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { PencilLine } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import type { Country, Employee } from '@/src/core/domain/employee';
import { HttpChargeabilityBlockRepository } from '@/src/adapters/http/HttpChargeabilityBlockRepository';
import { useForecastStore } from '@/src/store/StoreProvider';
import { useDebounce } from '@/src/hooks/useDebounce';
import { DataTable } from '@/src/components/ui/DataTable';
import { FilterBar } from '@/src/components/ui/FilterBar';
import { Badge } from '@/src/components/ui/Badge';
import { Modal } from '@/src/components/ui/Modal';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { Button } from '@/src/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { formatPercent } from '@/src/lib/formatters';
import { exportToXlsx } from '@/src/lib/excel';

const blockRepo = new HttpChargeabilityBlockRepository();

const rowVariants = {
  hidden: { opacity: 0, y: 5 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.20, ease: 'easeOut' as const, delay: Math.min(i * 0.035, 0.35) },
  }),
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const statusVariant = {
  green: 'green',
  yellow: 'yellow',
  red: 'red',
  unassigned: 'neutral',
  leave: 'neutral',
} as const;

const rowStatusClass: Record<string, string> = {
  green:      'bg-green-50  hover:bg-green-100',
  yellow:     'bg-amber-50  hover:bg-amber-100',
  red:        'bg-red-50    hover:bg-red-100',
  unassigned: 'bg-slate-50  hover:bg-slate-100',
  leave:      'bg-slate-50  hover:bg-slate-100',
};

const COUNTRY_LABELS: Record<Country, string> = {
  AR: 'Argentina',
  MX: 'México',
  CR: 'Costa Rica',
};

interface CountryViewProps {
  country: Country;
}

export function CountryView({ country }: CountryViewProps) {
  const t = useTranslations('country');
  const searchParams = useSearchParams();
  const router = useRouter();
  const appState = useForecastStore((s) => s.appState);
  const isLoading = useForecastStore((s) => s.isLoading);
  const windowOffset = useForecastStore((s) => s.windowOffset);
  const fetchState = useForecastStore((s) => s.fetchState);

  const status = searchParams.get('status') ?? '';
  const filterOffering = searchParams.get('offering') ?? '';
  const scenario = (searchParams.get('scenario') ?? '') as '' | 'assumption' | 'effective';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10));

  const [localSearch, setLocalSearch] = useState('');
  const [effectivizeTarget, setEffectivizeTarget] = useState<{ eid: string; name: string } | null>(null);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(0);
  const [rangeAnchor, setRangeAnchor] = useState<number | null>(null);
  const [effectivizePct, setEffectivizePct] = useState<string>('');
  const [isEffectivizing, setIsEffectivizing] = useState(false);
  const [effectivizeError, setEffectivizeError] = useState<string | null>(null);
  const debouncedQ = useDebounce(localSearch, 200);

  const statusLabel: Record<string, string> = {
    green: t('statusChargeable'),
    yellow: t('statusAtRisk'),
    red: t('statusNotChargeable'),
    unassigned: t('statusUnassigned'),
    leave: t('statusOnLeave'),
  };

  const STATUS_OPTIONS = [
    { value: 'green', label: t('statusChargeable') },
    { value: 'yellow', label: t('statusAtRisk') },
    { value: 'red', label: t('statusNotChargeable') },
    { value: 'unassigned', label: t('statusUnassigned') },
    { value: 'leave', label: t('statusOnLeave') },
  ];

  const countryEmployees = useMemo(
    () => (appState?.employees ?? []).filter((e) => e.country === country),
    [appState, country],
  );

  const offeringOptions = useMemo(() => {
    const types = new Set(countryEmployees.map((e) => e.projectType).filter(Boolean) as string[]);
    return Array.from(types).sort().map((v) => ({ value: v, label: v }));
  }, [countryEmployees]);

  const filtered = useMemo(() => {
    let result = countryEmployees;
    if (debouncedQ) {
      const lq = debouncedQ.toLowerCase();
      result = result.filter(
        (e) => e.name.toLowerCase().includes(lq) || e.id.toLowerCase().includes(lq),
      );
    }
    if (status) result = result.filter((e) => e.chargeabilityStatus === status);
    if (filterOffering) result = result.filter((e) => e.projectType === filterOffering);
    return result;
  }, [countryEmployees, debouncedQ, status, filterOffering]);

  const totalFiltered = filtered.length;
  const pageCount = Math.ceil(totalFiltered / pageSize) || 1;
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const periods = appState?.periods ?? [];

  const columns = useMemo((): ColumnDef<Employee, unknown>[] => [
    {
      id: 'name',
      accessorKey: 'name',
      header: t('headerName'),
      cell: ({ row }) => <span className="font-medium text-[var(--G1)]">{row.original.name}</span>,
    },
    {
      id: 'id',
      accessorKey: 'id',
      header: t('headerEID'),
      cell: ({ row }) => <span className="text-xs text-[var(--G3)]">{row.original.id}</span>,
    },
    { id: 'level', accessorKey: 'level', header: t('headerLevel') },
    {
      id: 'client',
      accessorKey: 'client',
      header: t('headerClient'),
      cell: ({ row }) => row.original.client ?? <span className="text-[var(--G4)]">—</span>,
    },
    {
      id: 'scenario',
      accessorKey: 'scenarioType',
      header: 'Escenario',
      cell: ({ row }) => (
        <Badge variant={row.original.scenarioType === 'effective' ? 'blue' : 'neutral'}>
          {row.original.scenarioType === 'effective' ? 'Efectivo' : 'Estimación'}
        </Badge>
      ),
    },
    {
      id: 'chargeability',
      accessorKey: 'chargeabilityPercent',
      header: t('headerChargeability'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <ProgressBar
            value={row.original.chargeabilityPercent}
            max={1}
            color={
              row.original.chargeabilityStatus === 'green'
                ? 'var(--GR)'
                : row.original.chargeabilityStatus === 'yellow'
                  ? 'var(--YL)'
                  : 'var(--RD)'
            }
            className="flex-1"
          />
          <span className="text-xs text-[var(--G2)] w-10 text-right">
            {formatPercent(row.original.chargeabilityPercent)}
          </span>
        </div>
      ),
    },
    {
      id: 'status',
      accessorKey: 'chargeabilityStatus',
      header: t('headerStatus'),
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.chargeabilityStatus]}>
          {statusLabel[row.original.chargeabilityStatus]}
        </Badge>
      ),
    },
   
  ], [t, statusLabel]);

  function openEffectivizeModal(e: Employee) {
    setEffectivizeTarget({ eid: e.id, name: e.name });
    setRangeStart(0);
    setRangeEnd(periods.length - 1);
    setRangeAnchor(null);
    setEffectivizePct(String(e.cp[0] ?? 100));
    setEffectivizeError(null);
  }

  function closeEffectivizeModal() {
    if (isEffectivizing) return;
    setEffectivizeTarget(null);
    setEffectivizeError(null);
  }

  function handlePeriodChipClick(idx: number) {
    const emp = countryEmployees.find((e) => e.id === effectivizeTarget?.eid);
    if (rangeAnchor !== null) {
      const newStart = Math.min(rangeAnchor, idx);
      const newEnd = Math.max(rangeAnchor, idx);
      setRangeStart(newStart);
      setRangeEnd(newEnd);
      setRangeAnchor(null);
      setEffectivizePct(String(emp?.cp[newStart] ?? 100));
    } else {
      setRangeAnchor(idx);
      setRangeStart(idx);
      setRangeEnd(idx);
      setEffectivizePct(String(emp?.cp[idx] ?? 100));
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
      setEffectivizeTarget(null);
    } catch (err) {
      setEffectivizeError(err instanceof Error ? err.message : 'Error al efectivizar');
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

  function goToPage(newPage: number) {
    const p = new URLSearchParams(searchParams.toString());
    newPage > 1 ? p.set('page', String(newPage)) : p.delete('page');
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  function goToPageSize(size: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set('pageSize', String(size));
    p.delete('page');
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  function handleExport() {
    const rows = filtered.map((e) => ({
      EID: e.id,
      Nombre: e.name,
      CL: e.level,
      Cliente: e.client ?? '',
      Tipo: e.projectType ?? '',
      Manager: e.manager ?? '',
      'Roll On': e.rollOn ?? '',
      'Roll Off': e.rollOff ?? '',
      FAD: e.fad ?? '',
      Días: e.daysToAvailable,
      Ingreso: e.hireDate ?? '',
      'Próx. PTO': e.nextPTO ?? '',
      'Hs. PTO': e.nextPTOHours ?? '',
      NJ: e.newJoiner ? 'Sí' : 'No',
      Cargable: e.charge ? 'Sí' : 'No',
      'Cargabilidad %': Math.round(e.chargeabilityPercent * 100),
      Estado: statusLabel[e.chargeabilityStatus],
    }));
    exportToXlsx(rows, `${COUNTRY_LABELS[country]}-forecast`);
  }

  if (isLoading && !appState) {
    return <CountrySkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--BK)]">{COUNTRY_LABELS[country]}</h1>
          <p className="text-sm text-[var(--G3)] mt-0.5">{t('countEmployees', { count: totalFiltered })}</p>
        </div>
        <Button variant="ghost" onClick={handleExport}>
          {t('exportBtn')}
        </Button>
      </div>
      <FilterBar
        search={{
          value: localSearch,
          onChange: setLocalSearch,
          placeholder: t('searchPlaceholder'),
        }}
        toggleGroups={[
          {
            label: t('statusFilter'),
            options: STATUS_OPTIONS,
            active: status ? [status] : [],
            onToggle: (v) => setParam('status', status === v ? '' : v),
          },
          ...(offeringOptions.length > 0
            ? [{
                label: t('offeringFilter'),
                options: offeringOptions,
                active: filterOffering ? [filterOffering] : [],
                onToggle: (v: string) => setParam('offering', filterOffering === v ? '' : v),
              }]
            : []),
        ]}
      />
      <DataTable
        data={paged}
        columns={columns}
        tableKey={`country-${country}`}
        onRowClick={(e) => router.push(`/employees/${e.id}`)}
        getRowClassName={(e) => rowStatusClass[e.chargeabilityStatus] ?? 'hover:bg-[var(--G6)]'}
        pagination={{
          page: safePage,
          pageSize,
          total: totalFiltered,
          pages: pageCount,
          onPageChange: goToPage,
          onPageSizeChange: goToPageSize,
        }}
      />

      {/* Forecast por períodos */}
      {periods.length > 0 && countryEmployees.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--G1)]">{t('forecastTitle')}</h2>
              <div className="flex items-center gap-1 rounded-md border border-[var(--G5)] p-0.5">
                {(['', 'assumption', 'effective'] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => setParam('scenario', scenario === val ? '' : val)}
                    className={`px-2.5 py-1 text-xs rounded transition-colors ${
                      scenario === val
                        ? 'bg-[var(--P)] text-white'
                        : 'text-[var(--G3)] hover:text-[var(--G1)]'
                    }`}
                  >
                    {val === '' ? 'Todos' : val === 'assumption' ? 'Estimación' : 'Efectivos'}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--G5)]">
                    <th className="text-left py-2 pr-4 text-[var(--G3)] font-semibold sticky left-0 bg-white min-w-[160px]">
                      Empleado
                    </th>
                    {periods.map((p, i) => (
                      <th
                        key={p.label}
                        className={`text-center py-2 px-3 font-semibold min-w-[80px] ${i === 0 ? 'text-[var(--P)]' : 'text-[var(--G3)]'}`}
                      >
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="sync">
                    {(scenario ? paged.filter((e) => e.scenarioType === scenario) : paged).map((e, index) => (
                      <motion.tr
                        key={e.id}
                        custom={index}
                        variants={rowVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="group border-b border-[var(--G6)] hover:bg-[var(--G6)]"
                      >
                        <td className="py-2 pr-4 sticky left-0 bg-white">
                          <div className="flex items-center gap-1.5">
                            <button
                              className="text-[var(--P)] hover:underline text-left font-medium"
                              onClick={() => router.push(`/employees/${e.id}`)}
                            >
                              {e.name}
                            </button>
                            {e.scenarioType === 'assumption' && (
                              <button
                                title="Hacer efectivo"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--G3)] hover:text-[var(--P)] p-0.5 rounded"
                                onClick={(ev) => { ev.stopPropagation(); openEffectivizeModal(e); }}
                              >
                                <PencilLine size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                        {e.cp.map((cp, i) => (
                          <td key={i} className={`py-2 px-3 text-center ${i === 0 ? 'font-semibold' : ''}`}>
                            <span className={cp >= 80 ? 'text-[var(--GR)]' : cp >= 50 ? 'text-[var(--YL)]' : 'text-[var(--RD)]'}>
                              {cp}%
                            </span>
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
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
                    disabled={isEffectivizing}
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
              {rangeAnchor !== null ? 'Click en otro período para completar el rango' : 'Click para seleccionar desde, click de nuevo para hasta'}
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
                disabled={isEffectivizing}
              />
              <span className="text-sm text-[var(--G3)] shrink-0">%</span>
            </div>
          </div>
        </div>
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

function CountrySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-8 w-96" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
