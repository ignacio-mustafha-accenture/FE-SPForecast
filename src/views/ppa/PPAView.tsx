'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import type { PPALog } from '@/src/core/domain/ppa';
import type { Page } from '@/src/core/domain/pagination';
import { getClientContainer } from '@/src/application/container';
import { useDebounce } from '@/src/hooks/useDebounce';
import { DataTable } from '@/src/components/ui/DataTable';
import { FilterBar } from '@/src/components/ui/FilterBar';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Button } from '@/src/components/ui/Button';

import { PPAPanel } from './PPAPanel';

export function PPAView() {
  const t = useTranslations('ppa');
  const searchParams = useSearchParams();
  const router = useRouter();

  const eid = searchParams.get('eid') ?? '';
  const fromPeriod = searchParams.get('from_period') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10));

  const debouncedEid = useDebounce(eid, 300);

  const [result, setResult] = useState<Page<PPALog> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  const columns: ColumnDef<PPALog, unknown>[] = [
    { id: 'employeeName', accessorKey: 'employeeName', header: t('columnEmployee') },
    { id: 'country', accessorKey: 'country', header: t('columnCountry') },
    { id: 'fromPeriod', accessorKey: 'fromPeriod', header: t('columnFrom') },
    { id: 'toPeriod', accessorKey: 'toPeriod', header: t('columnTo') },
    { id: 'hours', accessorKey: 'hours', header: t('columnHours'), cell: ({ row }) => `${row.original.hours}h` },
    { id: 'reason', accessorKey: 'reason', header: t('columnReason') },
    { id: 'appliedAt', accessorKey: 'appliedAt', header: t('columnDate') },
  ];

  async function loadList() {
    setIsLoading(true);
    try {
      const data = await getClientContainer().listPPA.execute({
        eid: debouncedEid || undefined,
        fromPeriod: fromPeriod || undefined,
        page,
        pageSize,
      });
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    getClientContainer()
      .listPPA.execute({
        eid: debouncedEid || undefined,
        fromPeriod: fromPeriod || undefined,
        page,
        pageSize,
      })
      .then((data) => { if (!cancelled) setResult(data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedEid, fromPeriod, page, pageSize]);

  function setEid(value: string) {
    const p = new URLSearchParams(searchParams.toString());
    value ? p.set('eid', value) : p.delete('eid');
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
        <Button onClick={() => setPanelOpen(true)}>{t('newPPA')}</Button>
      </div>
      <FilterBar
        search={{ value: eid, onChange: setEid, placeholder: t('searchPlaceholder') }}
      />
      <DataTable
        data={result?.items ?? []}
        columns={columns}
        tableKey="ppa"
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

      <PPAPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onCreated={() => { setPanelOpen(false); loadList(); }}
      />
    </div>
  );
}
