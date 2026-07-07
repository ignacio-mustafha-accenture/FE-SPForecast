'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import type { PPALog } from '@/src/core/domain/ppa';
import type { Page } from '@/src/core/domain/pagination';
import { getClientContainer } from '@/src/application/container';
import { useForecastStore } from '@/src/store/StoreProvider';
import { useDebounce } from '@/src/hooks/useDebounce';
import { DataTable } from '@/src/components/ui/DataTable';
import { FilterBar } from '@/src/components/ui/FilterBar';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Button } from '@/src/components/ui/Button';
import { Drawer } from '@/src/components/ui/Drawer';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { Textarea } from '@/src/components/ui/Textarea';
import { useToast } from '@/src/hooks/useToast';

interface PPAForm {
  eid: string;
  fromPeriod: string;
  toPeriod: string;
  hours: number;
  reason: string;
}

export function PPAView() {
  const t = useTranslations('ppa');
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const appState = useForecastStore((s) => s.appState);

  const eid = searchParams.get('eid') ?? '';
  const fromPeriod = searchParams.get('from_period') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10));

  const debouncedEid = useDebounce(eid, 300);

  const [result, setResult] = useState<Page<PPALog> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const periods = appState?.periods ?? [];
  const periodOptions = periods.map((p) => ({ value: p.label, label: p.label }));

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PPAForm>({
    defaultValues: {
      fromPeriod: periods[0]?.label ?? '',
      toPeriod: periods[1]?.label ?? periods[0]?.label ?? '',
    },
  });

  const columns: ColumnDef<PPALog, unknown>[] = [
    { id: 'employeeName', accessorKey: 'employeeName', header: t('columnEmployee') },
    { id: 'country', accessorKey: 'country', header: t('columnCountry') },
    { id: 'fromPeriod', accessorKey: 'fromPeriod', header: t('columnFrom') },
    { id: 'toPeriod', accessorKey: 'toPeriod', header: t('columnTo') },
    { id: 'hours', accessorKey: 'hours', header: t('columnHours'), cell: ({ row }) => `${row.original.hours}h` },
    { id: 'reason', accessorKey: 'reason', header: t('columnReason') },
    { id: 'appliedAt', accessorKey: 'appliedAt', header: t('columnDate') },
  ];

  useEffect(() => {
    let cancelled = false;
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

  async function onCreatePPA(data: PPAForm) {
    setCreating(true);
    try {
      await getClientContainer().applyPPA.execute({
        eid: data.eid.trim(),
        fromPeriod: data.fromPeriod,
        toPeriod: data.toPeriod,
        hours: Number(data.hours),
        reason: data.reason,
      });
      toast.success(t('toastCreated'));
      setDrawerOpen(false);
      reset();
      // Refresh list
      const fresh = await getClientContainer().listPPA.execute({ page: 1, pageSize });
      setResult(fresh);
    } catch {
      toast.error(t('toastError'));
    } finally {
      setCreating(false);
    }
  }

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
        <Button onClick={() => setDrawerOpen(true)}>{t('newPPA')}</Button>
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={t('drawerTitle')}>
        <form onSubmit={handleSubmit(onCreatePPA)} className="space-y-4">
          <Input
            label={t('fieldEmployee')}
            placeholder={t('fieldEmployeePlaceholder')}
            {...register('eid', { required: true })}
            error={errors.eid ? 'Requerido' : undefined}
          />
          {periodOptions.length > 0 ? (
            <>
              <Select
                label={t('fieldFrom')}
                options={periodOptions}
                {...register('fromPeriod', { required: true })}
              />
              <Select
                label={t('fieldTo')}
                options={periodOptions}
                {...register('toPeriod', { required: true })}
              />
            </>
          ) : (
            <>
              <Input
                label={t('fieldFrom')}
                placeholder="Jun-P1"
                {...register('fromPeriod', { required: true })}
              />
              <Input
                label={t('fieldTo')}
                placeholder="Jun-P2"
                {...register('toPeriod', { required: true })}
              />
            </>
          )}
          <Input
            label={t('fieldHours')}
            type="number"
            min={1}
            {...register('hours', { required: true, min: 1, valueAsNumber: true })}
            error={errors.hours ? 'Requerido' : undefined}
          />
          <Textarea
            label={t('fieldReason')}
            placeholder={t('fieldReasonPlaceholder')}
            {...register('reason', { required: true })}
            error={errors.reason ? 'Requerido' : undefined}
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={creating} className="flex-1">
              {t('submitCreate')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
