'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import { useAuthStore } from '@/src/store/StoreProvider';
import { useDebounce } from '@/src/hooks/useDebounce';
import { DataTable } from '@/src/components/ui/DataTable';
import { FilterBar } from '@/src/components/ui/FilterBar';
import { Badge } from '@/src/components/ui/Badge';
import { Skeleton } from '@/src/components/ui/Skeleton';

type AuditRow = {
  id: number;
  created_at: string;
  user_email: string | null;
  action: string | null;
  method: string;
  endpoint: string;
  response_status: number;
  duration_ms: number;
};

type AuditPage = {
  total: number;
  page: number;
  page_size: number;
  items: AuditRow[];
};

const METHOD_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'neutral'> = {
  GET: 'blue',
  POST: 'green',
  PATCH: 'yellow',
  DELETE: 'red',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  return { date, time };
}

const PAGE_SIZE = 50;

export function MonitoringView() {
  const t = useTranslations('monitoring');
  const role = useAuthStore((s) => s.user?.role);
  const searchParams = useSearchParams();
  const router = useRouter();

  const email = searchParams.get('email') ?? '';
  const success = searchParams.get('success') ?? '';
  const method = searchParams.get('method') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

  const debouncedEmail = useDebounce(email, 300);

  const [result, setResult] = useState<AuditPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const columns: ColumnDef<AuditRow, unknown>[] = [
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: t('colDate'),
      cell: ({ row }) => {
        const { date, time } = formatDate(row.original.created_at);
        return (
          <div className="flex flex-col leading-tight">
            <span className="text-xs text-[var(--G1)] whitespace-nowrap">{date}</span>
            <span className="text-xs text-[var(--G4)] whitespace-nowrap">{time}</span>
          </div>
        );
      },
    },
    {
      id: 'user_email',
      accessorKey: 'user_email',
      header: t('colUser'),
      cell: ({ row }) =>
        row.original.user_email ? (
          <span className="text-sm text-[var(--G1)]">{row.original.user_email}</span>
        ) : (
          <span className="text-[var(--G4)]">—</span>
        ),
    },
    {
      id: 'action_label',
      accessorKey: 'action',
      header: t('colAction'),
      cell: ({ row }) =>
        row.original.action ? (
          <span className="text-sm text-[var(--G1)]">{row.original.action}</span>
        ) : (
          <span className="text-[var(--G4)]">—</span>
        ),
    },
    {
      id: 'request',
      header: t('colRequest'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant={METHOD_COLORS[row.original.method] ?? 'neutral'}>{row.original.method}</Badge>
          <span className="text-xs text-[var(--G2)] font-mono">{row.original.endpoint}</span>
        </div>
      ),
    },
    {
      id: 'response_status',
      accessorKey: 'response_status',
      header: t('colStatus'),
      cell: ({ row }) => (
        <Badge variant={row.original.response_status < 400 ? 'green' : 'red'}>
          {row.original.response_status}
        </Badge>
      ),
    },
    {
      id: 'duration_ms',
      accessorKey: 'duration_ms',
      header: t('colDuration'),
      cell: ({ row }) => (
        <span className="text-xs text-[var(--G3)]">{row.original.duration_ms}ms</span>
      ),
    },
  ];

  useEffect(() => {
    if (role !== 'admin') return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(PAGE_SIZE));
    if (debouncedEmail) params.set('email', debouncedEmail);
    if (success === 'true') params.set('success', 'true');
    if (success === 'false') params.set('success', 'false');
    if (method) params.set('method', method);

    fetch(`/api/admin/audit-log?${params.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setResult(d); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [role, debouncedEmail, success, method, page]);

  if (role !== 'admin') return null;

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

  const SUCCESS_OPTIONS = [
    { value: 'true', label: t('filterSuccess') },
    { value: 'false', label: t('filterError') },
  ];

  const METHOD_OPTIONS = [
    { value: 'GET', label: t('filterGet') },
    { value: 'POST', label: t('filterPost') },
    { value: 'PATCH', label: t('filterPatch') },
    { value: 'DELETE', label: t('filterDelete') },
  ];

  const totalPages = result ? Math.ceil(result.total / PAGE_SIZE) : 1;

  if (isLoading && !result) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--BK)]">{t('title')}</h1>
      <FilterBar
        search={{
          value: email,
          onChange: (v) => setParam('email', v),
          placeholder: t('searchPlaceholder'),
        }}
        toggleGroups={[
          {
            label: 'Status',
            options: SUCCESS_OPTIONS,
            active: success ? [success] : [],
            onToggle: (v) => setParam('success', success === v ? '' : v),
          },
          {
            label: 'Método',
            options: METHOD_OPTIONS,
            active: method ? [method] : [],
            onToggle: (v) => setParam('method', method === v ? '' : v),
          },
        ]}
      />
      <DataTable
        data={result?.items ?? []}
        columns={columns}
        tableKey="monitoring"
        pagination={
          result
            ? {
                page,
                pageSize: PAGE_SIZE,
                total: result.total,
                pages: totalPages,
                onPageChange: goToPage,
                onPageSizeChange: () => {},
              }
            : undefined
        }
      />
    </div>
  );
}
