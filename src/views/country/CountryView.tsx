'use client';

import type { ColumnDef } from '@tanstack/react-table';

import type { Country, Employee } from '@/src/core/domain/employee';
import { useCountryEmployees } from '@/src/hooks/useCountryEmployees';
import { useForecastLoading } from '@/src/hooks/useForecastState';
import { useUIStore } from '@/src/store/StoreProvider';
import { DataTable } from '@/src/components/ui/DataTable';
import { Badge } from '@/src/components/ui/Badge';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { formatPercent } from '@/src/lib/formatters';

import { EmployeeDrawer } from './EmployeeDrawer';

const statusVariant = {
  green: 'green',
  yellow: 'yellow',
  red: 'red',
  unassigned: 'neutral',
} as const;

const statusLabel = {
  green: 'Chargeable',
  yellow: 'En riesgo',
  red: 'No chargeable',
  unassigned: 'Sin asignar',
};

function buildColumns(onSelect: (id: string) => void): ColumnDef<Employee, unknown>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <button
          className="text-[var(--P)] hover:underline text-left font-medium"
          onClick={() => onSelect(row.original.id)}
        >
          {row.original.name}
        </button>
      ),
    },
    {
      id: 'level',
      accessorKey: 'level',
      header: 'Nivel',
    },
    {
      id: 'project',
      accessorKey: 'project',
      header: 'Proyecto',
      cell: ({ row }) => row.original.project ?? <span className="text-[var(--G3)]">—</span>,
    },
    {
      id: 'status',
      accessorKey: 'chargeabilityStatus',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.chargeabilityStatus]}>
          {statusLabel[row.original.chargeabilityStatus]}
        </Badge>
      ),
    },
    {
      id: 'chargeability',
      accessorKey: 'chargeabilityPercent',
      header: 'Chargeability',
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
      id: 'availableHours',
      accessorKey: 'availableHours',
      header: 'Hs. disponibles',
      cell: ({ row }) => `${row.original.availableHours}h`,
    },
  ];
}

interface CountryViewProps {
  country: Country;
}

const COUNTRY_LABELS: Record<Country, string> = {
  AR: 'Argentina',
  MX: 'México',
  CR: 'Costa Rica',
};

export function CountryView({ country }: CountryViewProps) {
  const employees = useCountryEmployees(country);
  const isLoading = useForecastLoading();
  const openDrawer = useUIStore((s) => s.openEmployeeDrawer);
  const drawerState = useUIStore((s) => s.employeeDrawer);
  const closeDrawer = useUIStore((s) => s.closeEmployeeDrawer);

  const columns = buildColumns(openDrawer);

  if (isLoading && employees.length === 0) {
    return <CountrySkeleton />;
  }

  const selectedEmployee = employees.find((e) => e.id === drawerState.employeeId) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--BK)]">{COUNTRY_LABELS[country]}</h1>
        <p className="text-sm text-[var(--G3)] mt-0.5">{employees.length} empleados</p>
      </div>
      <DataTable data={employees} columns={columns} tableKey={`country-${country}`} />
      <EmployeeDrawer
        open={drawerState.open}
        employee={selectedEmployee}
        onClose={closeDrawer}
      />
    </div>
  );
}

function CountrySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
