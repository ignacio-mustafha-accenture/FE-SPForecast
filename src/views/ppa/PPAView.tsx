'use client';

import type { ColumnDef } from '@tanstack/react-table';

import type { PPALog } from '@/src/core/domain/ppa';
import { useForecastStore } from '@/src/store/StoreProvider';
import { DataTable } from '@/src/components/ui/DataTable';
import { Skeleton } from '@/src/components/ui/Skeleton';

const columns: ColumnDef<PPALog, unknown>[] = [
  { id: 'employeeName', accessorKey: 'employeeName', header: 'Empleado' },
  { id: 'country', accessorKey: 'country', header: 'País' },
  { id: 'fromPeriod', accessorKey: 'fromPeriod', header: 'Desde' },
  { id: 'toPeriod', accessorKey: 'toPeriod', header: 'Hasta' },
  { id: 'hours', accessorKey: 'hours', header: 'Horas', cell: ({ row }) => `${row.original.hours}h` },
  { id: 'reason', accessorKey: 'reason', header: 'Motivo' },
  { id: 'appliedAt', accessorKey: 'appliedAt', header: 'Fecha' },
];

export function PPAView() {
  const ppaLogs = useForecastStore((s) => s.appState?.ppaLogs ?? []);
  const isLoading = useForecastStore((s) => s.isLoading);

  if (isLoading && ppaLogs.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--BK)]">PPA</h1>
      <DataTable data={ppaLogs} columns={columns} tableKey="ppa" />
    </div>
  );
}
