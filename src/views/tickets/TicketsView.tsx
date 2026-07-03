'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import type { Ticket } from '@/src/core/domain/ticket';
import { useForecastStore } from '@/src/store/StoreProvider';
import { DataTable } from '@/src/components/ui/DataTable';
import { Badge } from '@/src/components/ui/Badge';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Button } from '@/src/components/ui/Button';
import { TicketPanel } from './TicketPanel';

const typeLabel: Record<string, string> = {
  newproj: 'Nuevo proyecto',
  ongoing: 'En curso',
  pto: 'Vacaciones',
  sick: 'Enfermedad',
  nj: 'No justificado',
  baja: 'Baja',
};

const typeVariant: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'neutral' | 'purple'> = {
  newproj: 'green',
  ongoing: 'blue',
  pto: 'yellow',
  sick: 'yellow',
  nj: 'red',
  baja: 'red',
};

const columns: ColumnDef<Ticket, unknown>[] = [
  { id: 'employeeName', accessorKey: 'employeeName', header: 'Empleado' },
  { id: 'country', accessorKey: 'country', header: 'País' },
  {
    id: 'type',
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => (
      <Badge variant={typeVariant[row.original.type] ?? 'neutral'}>
        {typeLabel[row.original.type] ?? row.original.type}
      </Badge>
    ),
  },
  { id: 'status', accessorKey: 'status', header: 'Estado' },
  { id: 'date', accessorKey: 'date', header: 'Fecha' },
  { id: 'clientName', accessorKey: 'clientName', header: 'Cliente', cell: ({ row }) => row.original.clientName ?? <span className="text-[var(--G4)]">—</span> },
  { id: 'hoursToMove', accessorKey: 'hoursToMove', header: 'Horas', cell: ({ row }) => row.original.hoursToMove != null ? `${row.original.hoursToMove}h` : <span className="text-[var(--G4)]">—</span> },
  { id: 'comments', accessorKey: 'comments', header: 'Comentarios', cell: ({ row }) => row.original.comments ?? <span className="text-[var(--G4)]">—</span> },
];

export function TicketsView() {
  const tickets = useForecastStore((s) => s.appState?.tickets ?? []);
  const isLoading = useForecastStore((s) => s.isLoading);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  if (isLoading && tickets.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--BK)]">Tickets</h1>
        <Button onClick={() => { setSelectedTicket(null); setPanelOpen(true); }}>
          + Nuevo ticket
        </Button>
      </div>
      <DataTable data={tickets} columns={columns} tableKey="tickets" />
      <TicketPanel
        open={panelOpen}
        ticket={selectedTicket}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  );
}
