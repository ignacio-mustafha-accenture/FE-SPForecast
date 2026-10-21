'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';

import { PTO_STATUSES, type PtoPage, type PtoRow, type PtoSort, type PtoStatus } from '@/src/core/domain/pto';
import { getClientContainer } from '@/src/application/container';
import { useDebounce } from '@/src/hooks/useDebounce';
import { DataTable } from '@/src/components/ui/DataTable';
import { FilterBar } from '@/src/components/ui/FilterBar';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { exportToXlsx } from '@/src/lib/excel';
import { OFFERING_OPTIONS } from '@/src/core/domain/offerings';

const LEVELS = ['6', '7', '8', '9', '10', '11', '12', '13'].map((v) => ({ value: v, label: v }));
const SORT_KEYS: PtoSort[] = ['name', 'country', 'level', 'start', 'end', 'hours', 'status'];
// Tope que acepta el backend por pagina
const EXPORT_PAGE_SIZE = 200;

const ROW_CLASS: Record<PtoStatus, string> = {
  current: 'bg-[var(--YLB)]/40 hover:bg-[var(--YLB)] border-l-4 border-l-[var(--YL)]',
  upcoming: 'hover:bg-[var(--G6)] border-l-4 border-l-transparent',
  past: 'hover:bg-[var(--G6)] border-l-4 border-l-transparent opacity-70',
};

export function PtosView() {
  const t = useTranslations('ptos');
  const searchParams = useSearchParams();
  const router = useRouter();

  const country = searchParams.get('country') ?? '';
  const offering = searchParams.get('offering') ?? '';
  const level = searchParams.get('level') ?? '';
  const q = searchParams.get('q') ?? '';
  const statusParam = searchParams.get('status') ?? '';
  const status = PTO_STATUSES.find((s) => s === statusParam);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('page_size') ?? '25', 10) || 25));
  const sortParam = searchParams.get('sort') ?? '';
  const sort = SORT_KEYS.find((s) => s === sortParam);
  const dir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';

  // El input es local para no depender del round-trip de la URL en cada tecla;
  // la URL (y con ella el fetch) se actualiza recien cuando se deja de escribir.
  const [qInput, setQInput] = useState(q);
  const debouncedQInput = useDebounce(qInput, 400);

  const [result, setResult] = useState<PtoPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getClientContainer()
      .listPtos.execute({
        country: country || undefined,
        offering: offering || undefined,
        level: level || undefined,
        q: q || undefined,
        status,
        page,
        pageSize,
        sort,
        dir,
      })
      .then((data) => { if (!cancelled) { setResult(data); setFailed(false); } })
      .catch((e) => { console.error(e); if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [country, offering, level, q, status, page, pageSize, sort, dir]);

  // Cada cambio de filtro u orden vuelve a la primera pagina
  function updateParams(changes: Record<string, string>) {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    if (!('page' in changes)) p.delete('page');
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (debouncedQInput !== q) updateParams({ q: debouncedQInput });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQInput]);

  // Seleccion unica: elegir uno deselecciona el resto, y volver a tocarlo lo limpia
  function toggleCountry(v: string) {
    updateParams({ country: country === v ? '' : v });
  }

  function toggleOffering(v: string) {
    updateParams({ offering: offering === v ? '' : v });
  }

  const sorting: SortingState = sort ? [{ id: sort, desc: dir === 'desc' }] : [];

  function handleSortingChange(next: SortingState) {
    const s = next[0];
    updateParams(s ? { sort: s.id, dir: s.desc ? 'desc' : 'asc' } : { sort: '', dir: '' });
  }

  const columns: ColumnDef<PtoRow, unknown>[] = [
    {
      id: 'name',
      header: t('colEmployee'),
      accessorFn: (r) => r.name,
      cell: ({ row }) => (
        <Link
          href={`/employees/${row.original.eid}`}
          className="text-sm font-medium text-[var(--P)] hover:underline whitespace-nowrap"
        >
          {row.original.name}
        </Link>
      ),
    },
    { id: 'country', header: t('colCountry'), accessorFn: (r) => r.country },
    { id: 'level', header: t('colLevel'), accessorFn: (r) => r.level },
    {
      id: 'client',
      header: t('colClient'),
      enableSorting: false,
      accessorFn: (r) => r.client ?? '',
      cell: ({ row }) => <span className="text-xs text-[var(--G1)]">{row.original.client ?? t('noClient')}</span>,
    },
    { id: 'start', header: t('colStart'), accessorFn: (r) => r.start },
    { id: 'end', header: t('colEnd'), accessorFn: (r) => r.end },
    {
      id: 'hours',
      header: t('colHours'),
      accessorFn: (r) => r.hours ?? '',
      cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.hours ?? '—'}</span>,
    },
    {
      id: 'status',
      header: t('colStatus'),
      accessorFn: (r) => r.status,
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'current' ? 'yellow' : 'neutral'}>
          {t(`status.${row.original.status}`)}
        </Badge>
      ),
    },
  ];

  async function exportar() {
    setExporting(true);
    try {
      const filter = {
        country: country || undefined,
        offering: offering || undefined,
        level: level || undefined,
        q: q || undefined,
        status,
        sort,
        dir,
      } as const;
      const uc = getClientContainer().listPtos;
      const first = await uc.execute({ ...filter, page: 1, pageSize: EXPORT_PAGE_SIZE });
      const items = [...first.items];
      if (first.pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: first.pages - 1 }, (_, i) =>
            uc.execute({ ...filter, page: i + 2, pageSize: EXPORT_PAGE_SIZE }),
          ),
        );
        for (const p of rest) items.push(...p.items);
      }
      await exportToXlsx(
        items.map((r) => ({
          [t('colEmployee')]: r.name,
          ID: r.eid,
          [t('colCountry')]: r.country,
          [t('colLevel')]: r.level,
          [t('colClient')]: r.client ?? t('noClient'),
          [t('colStart')]: r.start,
          [t('colEnd')]: r.end,
          [t('colHours')]: r.hours ?? '',
          [t('colStatus')]: t(`status.${r.status}`),
        })),
        'ptos.xlsx',
        t('title'),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  }

  const statusOptions = PTO_STATUSES.map((st) => ({
    value: st,
    label: `${t(`status.${st}`)}${result ? ` (${result.counts[st]})` : ''}`,
  }));

  if (!result) return failed ? <p className="text-sm text-[var(--G3)]">{t('noData')}</p> : <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--BK)]">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-[var(--G3)]">{t('subtitle')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={exportar} disabled={exporting || !result || result.total === 0}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {t('exportCsv')}
        </Button>
      </div>

      <FilterBar
        search={{ value: qInput, onChange: setQInput, placeholder: t('searchPlaceholder') }}
        toggleGroups={[
          {
            label: t('colCountry'),
            options: ['AR', 'MX', 'CR'].map((c) => ({ value: c, label: c })),
            active: country ? [country] : [],
            onToggle: toggleCountry,
          },
          {
            label: 'Offering',
            options: OFFERING_OPTIONS,
            active: offering ? [offering] : [],
            onToggle: toggleOffering,
          },
        ]}
        selectGroups={[
          {
            label: t('statusFilter'),
            options: statusOptions,
            value: status ?? '',
            onChange: (v) => updateParams({ status: v }),
          },
          { label: t('colLevel'), options: LEVELS, value: level, onChange: (v) => updateParams({ level: v }) },
        ]}
      />

      {result && result.total === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--G3)]">{t('empty')}</p>
      ) : (
        <DataTable
          data={result?.items ?? []}
          columns={columns}
          tableKey="ptos"
          getRowClassName={(r) => ROW_CLASS[r.status]}
          manualSorting
          sorting={sorting}
          onSortingChange={handleSortingChange}
          pagination={
            result
              ? {
                  page: result.page,
                  pageSize: result.pageSize,
                  total: result.total,
                  pages: result.pages,
                  onPageChange: (p) => updateParams({ page: p > 1 ? String(p) : '' }),
                  onPageSizeChange: (s) => updateParams({ page_size: String(s) }),
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
