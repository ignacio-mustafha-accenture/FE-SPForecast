'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import type { Ticket } from '@/src/core/domain/ticket';
import type { Page } from '@/src/core/domain/pagination';
import { getClientContainer } from '@/src/application/container';
import { useDebounce } from '@/src/hooks/useDebounce';
import { DataTable } from '@/src/components/ui/DataTable';
import { FilterBar } from '@/src/components/ui/FilterBar';
import { Badge } from '@/src/components/ui/Badge';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Button } from '@/src/components/ui/Button';
import { TicketPanel } from './TicketPanel';

const typeVariant: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'neutral' | 'purple'> = {
  newproj: 'green',
  ongoing: 'blue',
  pto: 'yellow',
  sick: 'yellow',
  nj: 'red',
  baja: 'red',
};

export function TicketsView() {
  const t = useTranslations('tickets');
  const searchParams = useSearchParams();
  const router = useRouter();

  const status = searchParams.get('status') ?? '';
  const type = searchParams.get('type') ?? '';
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10));

  const debouncedQ = useDebounce(q, 300);

  const [result, setResult] = useState<Page<Ticket> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const typeLabel: Record<string, string> = {
    newproj: t('typeNewproj'),
    ongoing: t('typeOngoing'),
    pto: t('typePTO'),
    sick: t('typeSick'),
    nj: t('typeNJ'),
    baja: t('typeBaja'),
  };

  const STATUS_OPTIONS = [
    { value: 'Abierto', label: t('statusOpen') },
    { value: 'Cerrado', label: t('statusClosed') },
  ];

  const TYPE_OPTIONS = [
    { value: 'newproj', label: t('typeNewproj') },
    { value: 'ongoing', label: t('typeOngoing') },
    { value: 'pto', label: t('typePTO') },
    { value: 'sick', label: t('typeSick') },
    { value: 'nj', label: t('typeNJ') },
    { value: 'baja', label: t('typeBaja') },
  ];

  const columns: ColumnDef<Ticket, unknown>[] = [
    { id: 'employeeName', accessorKey: 'employeeName', header: t('columnEmployee') },
    { id: 'country', accessorKey: 'country', header: t('columnCountry') },
    {
      id: 'type',
      accessorKey: 'type',
      header: t('columnType'),
      cell: ({ row }) => (
        <Badge variant={typeVariant[row.original.type] ?? 'neutral'}>
          {typeLabel[row.original.type] ?? row.original.type}
        </Badge>
      ),
    },
    { id: 'status', accessorKey: 'status', header: t('columnStatus') },
    { id: 'date', accessorKey: 'date', header: t('columnDate') },
    {
      id: 'clientName',
      accessorKey: 'clientName',
      header: t('columnClient'),
      cell: ({ row }) => row.original.clientName ?? <span className="text-[var(--G4)]">—</span>,
    },
    {
      id: 'hoursToMove',
      accessorKey: 'hoursToMove',
      header: t('columnHours'),
      cell: ({ row }) =>
        row.original.hoursToMove != null ? `${row.original.hoursToMove}h` : <span className="text-[var(--G4)]">—</span>,
    },
    {
      id: 'comments',
      accessorKey: 'comments',
      header: t('columnComments'),
      cell: ({ row }) => row.original.comments ?? <span className="text-[var(--G4)]">—</span>,
    },
  ];

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getClientContainer()
      .listTickets.execute({
        status: status || undefined,
        type: type || undefined,
        q: debouncedQ || undefined,
        page,
        pageSize,
      })
      .then((data) => { if (!cancelled) setResult(data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [status, type, debouncedQ, page, pageSize]);

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

  if (isLoading && !result) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--BK)]">{t('title')}</h1>
        <Button onClick={() => { setSelectedTicket(null); setPanelOpen(true); }}>
          {t('newTicket')}
        </Button>
      </div>
      <FilterBar
        search={{ value: q, onChange: (v) => setParam('q', v), placeholder: t('searchPlaceholder') }}
        toggleGroups={[
          {
            label: t('statusFilter'),
            options: STATUS_OPTIONS,
            active: status ? [status] : [],
            onToggle: (v) => setParam('status', status === v ? '' : v),
          },
          {
            label: t('typeFilter'),
            options: TYPE_OPTIONS,
            active: type ? [type] : [],
            onToggle: (v) => setParam('type', type === v ? '' : v),
          },
        ]}
      />
      <DataTable
        data={result?.items ?? []}
        columns={columns}
        tableKey="tickets"
        pagination={
          result
            ? {
                page: result.page,
                pageSize: result.pageSize,
                total: result.total,
                pages: result.pages,
                onPageChange: goToPage,
                onPageSizeChange: goToPageSize,
              }
            : undefined
        }
      />
      <TicketPanel
        open={panelOpen}
        ticket={selectedTicket}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  );
}
