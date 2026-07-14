'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import type { Ticket } from '@/src/core/domain/ticket';
import type { Page } from '@/src/core/domain/pagination';
import { getClientContainer } from '@/src/application/container';
import { useAuthStore, useForecastStore } from '@/src/store/StoreProvider';
import { useDebounce } from '@/src/hooks/useDebounce';
import { useToast } from '@/src/hooks/useToast';
import { DataTable } from '@/src/components/ui/DataTable';
import { FilterBar } from '@/src/components/ui/FilterBar';
import { Badge } from '@/src/components/ui/Badge';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Button } from '@/src/components/ui/Button';
import { Modal } from '@/src/components/ui/Modal';
import { Check, X } from 'lucide-react';
import { TicketPanel } from './TicketPanel';

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

export function TicketsView() {
  const t = useTranslations('tickets');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const storeEmployees = useForecastStore((s) => s.appState?.employees ?? []);
  const employeeClientMap = new Map(storeEmployees.map((e) => [e.id, e.client]));

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
  const [refreshKey, setRefreshKey] = useState(0);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);

  const typeLabel: Record<string, string> = {
    newproj: t('typeNewproj'),
    ongoing: t('typeOngoing'),
    pto: t('typePTO'),
    sick: t('typeSick'),
    nj: t('typeNJ'),
    baja: t('typeBaja'),
  };

  const STATUS_OPTIONS = [
    { value: 'Open', label: t('statusOpen') },
    { value: 'Approved', label: t('statusApproved') },
    { value: 'Rejected', label: t('statusRejected') },
  ];

  const statusLabel: Record<string, string> = {
    Open: t('statusOpen'),
    Approved: t('statusApproved'),
    Rejected: t('statusRejected'),
  };

  const TYPE_OPTIONS = [
    { value: 'newproj', label: t('typeNewproj') },
    { value: 'ongoing', label: t('typeOngoing') },
    { value: 'pto', label: t('typePTO') },
    { value: 'sick', label: t('typeSick') },
    { value: 'nj', label: t('typeNJ') },
    { value: 'baja', label: t('typeBaja') },
  ];

  async function handleApprove(id: string) {
    try {
      await getClientContainer().approveTicket.execute(id);
      toast.success(t('toastApproved'));
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error(t('toastApproveError'));
    }
  }

  function openRejectModal(id: string) {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  }

  async function handleRejectConfirm() {
    if (!rejectTargetId || !rejectReason.trim()) return;
    setRejectSaving(true);
    try {
      await getClientContainer().rejectTicket.execute(rejectTargetId, rejectReason.trim());
      toast.success(t('toastRejected'));
      setRefreshKey((k) => k + 1);
      setRejectModalOpen(false);
    } catch {
      toast.error(t('toastRejectError'));
    } finally {
      setRejectSaving(false);
    }
  }

  const baseColumns: ColumnDef<Ticket, unknown>[] = [
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
    {
      id: 'status',
      accessorKey: 'status',
      header: t('columnStatus'),
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status] ?? 'neutral'}>
          {statusLabel[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    { id: 'date', accessorKey: 'date', header: t('columnDate') },
    {
      id: 'dates',
      header: t('columnDates'),
      cell: ({ row }) => {
        const { startDate, endDate } = row.original;
        if (!startDate) return <span className="text-[var(--G4)]">—</span>;
        const end = endDate ?? startDate;
        return (
          <span className="whitespace-nowrap">
            {startDate === end ? startDate : `${startDate} – ${end}`}
          </span>
        );
      },
    },
    {
      id: 'clientName',
      accessorKey: 'clientName',
      header: t('columnClient'),
      cell: ({ row }) => {
        const client = row.original.clientName ?? employeeClientMap.get(row.original.employeeId) ?? null;
        return client ?? <span className="text-[var(--G4)]">—</span>;
      },
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

  const actionsColumn: ColumnDef<Ticket, unknown> = {
    id: 'actions',
    header: t('columnActions'),
    cell: ({ row }) =>
      row.original.status === 'Open' ? (
        <div className="flex items-center gap-1.5">
          <Button
            variant="approve-outline"
            size="sm"
            onClick={() => handleApprove(row.original.id)}
          >
            <Check size={13} strokeWidth={2.5} />
            {t('approve')}
          </Button>
          <Button
            variant="reject-outline"
            size="sm"
            onClick={() => openRejectModal(row.original.id)}
          >
            <X size={13} strokeWidth={2.5} />
            {t('reject')}
          </Button>
        </div>
      ) : null,
  };

  const columns = isAdmin ? [...baseColumns, actionsColumn] : baseColumns;

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
  }, [status, type, debouncedQ, page, pageSize, refreshKey]);

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
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={t('rejectModalTitle')}
        width="480px"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--G1)]">
              {t('rejectModalReasonLabel')}
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('rejectModalReasonPlaceholder')}
              rows={4}
              className="w-full rounded border border-[var(--G5)] bg-white px-3 py-2 text-sm text-[var(--G1)] placeholder:text-[var(--G4)] focus:outline-none focus:border-[var(--P)] focus:ring-1 focus:ring-[var(--P)] transition-colors resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="reject"
              className="flex-1"
              loading={rejectSaving}
              disabled={!rejectReason.trim()}
              onClick={handleRejectConfirm}
            >
              {t('rejectModalConfirm')}
            </Button>
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
