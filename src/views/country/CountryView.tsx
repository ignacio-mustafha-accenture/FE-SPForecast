'use client';

import { useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import type { Country, Employee } from '@/src/core/domain/employee';
import { useForecastStore, useUIStore } from '@/src/store/StoreProvider';
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

import { EmployeeDrawer } from './EmployeeDrawer';

const statusVariant = {
  green: 'green',
  yellow: 'yellow',
  red: 'red',
  unassigned: 'neutral',
  leave: 'neutral',
} as const;

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
  const openDrawer = useUIStore((s) => s.openEmployeeDrawer);
  const drawerState = useUIStore((s) => s.employeeDrawer);
  const closeDrawer = useUIStore((s) => s.closeEmployeeDrawer);
  const appState = useForecastStore((s) => s.appState);
  const isLoading = useForecastStore((s) => s.isLoading);

  const q = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const filterOffering = searchParams.get('offering') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10));

  const debouncedQ = useDebounce(q, 300);

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
      cell: ({ row }) => (
        <button
          className="text-[var(--P)] hover:underline text-left font-medium"
          onClick={() => openDrawer(row.original.id)}
        >
          {row.original.name}
        </button>
      ),
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
      id: 'projectType',
      accessorKey: 'projectType',
      header: t('headerOffering'),
      cell: ({ row }) => row.original.projectType ?? <span className="text-[var(--G4)]">—</span>,
    },
    {
      id: 'manager',
      accessorKey: 'manager',
      header: t('headerManager'),
      cell: ({ row }) => row.original.manager ?? <span className="text-[var(--G4)]">—</span>,
    },
    {
      id: 'rollOn',
      accessorKey: 'rollOn',
      header: t('headerRollOn'),
      cell: ({ row }) => row.original.rollOn ?? <span className="text-[var(--G4)]">—</span>,
    },
    {
      id: 'rollOff',
      accessorKey: 'rollOff',
      header: t('headerRollOff'),
      cell: ({ row }) => row.original.rollOff ?? <span className="text-[var(--G4)]">—</span>,
    },
    {
      id: 'fad',
      accessorKey: 'fad',
      header: t('headerFAD'),
      cell: ({ row }) => row.original.fad ?? <span className="text-[var(--G4)]">—</span>,
    },
    {
      id: 'daysToAvailable',
      accessorKey: 'daysToAvailable',
      header: t('headerDays'),
      cell: ({ row }) => row.original.daysToAvailable > 0 ? row.original.daysToAvailable : <span className="text-[var(--G4)]">—</span>,
    },
    {
      id: 'hireDate',
      accessorKey: 'hireDate',
      header: t('headerHireDate'),
      cell: ({ row }) => row.original.hireDate ?? <span className="text-[var(--G4)]">—</span>,
    },
    {
      id: 'nextPTO',
      accessorKey: 'nextPTO',
      header: t('headerNextPTO'),
      cell: ({ row }) => row.original.nextPTO ?? <span className="text-[var(--G4)]">—</span>,
    },
    {
      id: 'nextPTOHours',
      accessorKey: 'nextPTOHours',
      header: t('headerPTOHours'),
      cell: ({ row }) => row.original.nextPTOHours != null ? `${row.original.nextPTOHours}h` : <span className="text-[var(--G4)]">—</span>,
    },
    {
      id: 'newJoiner',
      accessorKey: 'newJoiner',
      header: t('headerNJ'),
      cell: ({ row }) => row.original.newJoiner ? <Badge variant="blue">NJ</Badge> : null,
    },
    {
      id: 'charge',
      accessorKey: 'charge',
      header: t('headerCharge'),
      cell: ({ row }) => row.original.charge ? <Badge variant="green">✓</Badge> : <Badge variant="neutral">—</Badge>,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, statusLabel]);

  const selectedEmployee = paged.find((e) => e.id === drawerState.employeeId) ??
    countryEmployees.find((e) => e.id === drawerState.employeeId) ?? null;

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
          value: q,
          onChange: (v) => setParam('q', v),
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
                  {paged.map((e) => (
                    <tr key={e.id} className="border-b border-[var(--G6)] hover:bg-[var(--G6)]">
                      <td className="py-2 pr-4 sticky left-0 bg-white">
                        <button
                          className="text-[var(--P)] hover:underline text-left font-medium"
                          onClick={() => openDrawer(e.id)}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <EmployeeDrawer open={drawerState.open} employee={selectedEmployee} onClose={closeDrawer} />
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
