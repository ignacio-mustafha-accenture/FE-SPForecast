'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';

const rowVariants = {
  hidden: { opacity: 0, y: 5 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.20, ease: 'easeOut' as const, delay: Math.min(i * 0.035, 0.35) },
  }),
  exit: { opacity: 0, transition: { duration: 0.12 } },
};
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import type { Country, Employee } from '@/src/core/domain/employee';
import { useForecastStore } from '@/src/store/StoreProvider';
import { useDebounce } from '@/src/hooks/useDebounce';
import { DataTable } from '@/src/components/ui/DataTable';
import { FilterBar } from '@/src/components/ui/FilterBar';
import { Badge } from '@/src/components/ui/Badge';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { Button } from '@/src/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { formatPercent } from '@/src/lib/formatters';
import { exportToXlsx } from '@/src/lib/excel';


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

  const status = searchParams.get('status') ?? '';
  const filterOffering = searchParams.get('offering') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10));

  const [localSearch, setLocalSearch] = useState('');
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, statusLabel]);

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
            <h2 className="text-sm font-semibold text-[var(--G1)]">{t('forecastTitle')}</h2>
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
                    {paged.map((e, index) => (
                      <motion.tr
                        key={e.id}
                        custom={index}
                        variants={rowVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="border-b border-[var(--G6)] hover:bg-[var(--G6)]"
                      >
                        <td className="py-2 pr-4 sticky left-0 bg-white">
                          <button
                            className="text-[var(--P)] hover:underline text-left font-medium"
                            onClick={() => router.push(`/employees/${e.id}`)}
                          >
                            {e.name}
                          </button>
                        </td>
                        {e.cp.map((cp, i) => {
                          const isA1 = cp === 50;
                          const isA2 = cp === 0 && !e.rollOff;
                          return (
                            <td key={i} className={`py-2 px-3 text-center ${i === 0 ? 'font-semibold' : ''}`}>
                              <span className={cp >= 80 ? 'text-[var(--GR)]' : cp >= 50 ? 'text-[var(--YL)]' : 'text-[var(--RD)]'}>
                                {cp}%
                              </span>
                              {isA1 && <span className="ml-1 text-[var(--G3)] text-[10px]">A1</span>}
                              {isA2 && <span className="ml-1 text-[var(--G3)] text-[10px]">A2</span>}
                            </td>
                          );
                        })}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

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
