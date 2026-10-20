'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';

import {
  UNASSIGNED_GROUPS,
  type UnassignedGroup,
  type UnassignedPage,
  type UnassignedRow,
  type UnassignedSort,
} from '@/src/core/domain/unassigned';
import { getClientContainer } from '@/src/application/container';
import { useDebounce } from '@/src/hooks/useDebounce';
import { DataTable } from '@/src/components/ui/DataTable';
import { FilterBar } from '@/src/components/ui/FilterBar';
import { Button } from '@/src/components/ui/Button';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { exportToXlsx } from '@/src/lib/excel';
import { cn } from '@/src/lib/cn';
import { OFFERING_OPTIONS } from '@/src/core/domain/offerings';

const LEVELS = ['6', '7', '8', '9', '10', '11', '12', '13'].map((v) => ({ value: v, label: v }));
const SORT_KEYS: UnassignedSort[] = ['name', 'country', 'level', 'client', 'roll_off', 'days'];
// Tope que acepta el backend por pagina
const EXPORT_PAGE_SIZE = 200;

const ESTILO: Record<UnassignedGroup, { text: string; dot: string; row: string }> = {
  unassigned: {
    text: 'text-[var(--RD)]',
    dot: 'bg-[var(--RD)]',
    row: 'bg-[var(--RDB)]/40 hover:bg-[var(--RDB)] border-l-4 border-l-[var(--RD)]',
  },
  mes_actual: {
    text: 'text-[var(--YL)]',
    dot: 'bg-[var(--YL)]',
    row: 'bg-[var(--YLB)]/40 hover:bg-[var(--YLB)] border-l-4 border-l-[var(--YL)]',
  },
  mes1: {
    text: 'text-[var(--YL)]',
    dot: 'bg-[var(--YL)]/60',
    row: 'hover:bg-[var(--G6)] border-l-4 border-l-[var(--YL)]/50',
  },
  mes2: {
    text: 'text-[var(--BL)]',
    dot: 'bg-[var(--BL)]',
    row: 'hover:bg-[var(--BLB)] border-l-4 border-l-[var(--BL)]',
  },
};

export function UnassignedView() {
  const t = useTranslations('unassigned');
  const searchParams = useSearchParams();
  const router = useRouter();

  const country = searchParams.get('country') ?? '';
  const offering = searchParams.get('offering') ?? '';
  const level = searchParams.get('level') ?? '';
  const q = searchParams.get('q') ?? '';
  const groupParam = searchParams.get('group') ?? '';
  const group = UNASSIGNED_GROUPS.find((g) => g === groupParam);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('page_size') ?? '25', 10) || 25));
  const sortParam = searchParams.get('sort') ?? '';
  const sort = SORT_KEYS.find((s) => s === sortParam);
  const dir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';

  // El input es local para no depender del round-trip de la URL en cada tecla;
  // la URL (y con ella el fetch) se actualiza recien cuando se deja de escribir.
  const [qInput, setQInput] = useState(q);
  const debouncedQInput = useDebounce(qInput, 400);

  const [result, setResult] = useState<UnassignedPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getClientContainer()
      .listUnassigned.execute({
        country: country || undefined,
        offering: offering || undefined,
        level: level || undefined,
        q: q || undefined,
        group,
        page,
        pageSize,
        sort,
        dir,
      })
      .then((data) => { if (!cancelled) { setResult(data); setFailed(false); } })
      .catch((e) => { console.error(e); if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [country, offering, level, q, group, page, pageSize, sort, dir]);

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

  const columns: ColumnDef<UnassignedRow, unknown>[] = [
    {
      id: 'name',
      header: t('colEmployee'),
      accessorFn: (r) => r.name,
      cell: ({ row }) => (
        <Link
          href={`/employees/${row.original.id}`}
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
      accessorFn: (r) => r.client ?? '',
      cell: ({ row }) => <span className="text-xs text-[var(--G1)]">{row.original.client ?? t('noClient')}</span>,
    },
    { id: 'roll_off', header: t('colRollOff'), accessorFn: (r) => r.rollOff ?? '—' },
    {
      id: 'days',
      sortDescFirst: false,
      header: t('colDays'),
      accessorFn: (r) => r.days ?? '',
      cell: ({ row }) => (
        <span className="text-xs tabular-nums">
          {row.original.days == null
            ? '—'
            : row.original.group === 'unassigned'
              ? `+${row.original.days}`
              : row.original.days}
        </span>
      ),
    },
    {
      id: 'group',
      header: t('colGroup'),
      enableSorting: false,
      accessorFn: (r) => r.group,
      cell: ({ row }) => (
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', ESTILO[row.original.group].text)}>
          <span className={cn('h-2 w-2 rounded-full', ESTILO[row.original.group].dot)} />
          {t(`group.${row.original.group}`)}
        </span>
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
        group,
        sort,
        dir,
      } as const;
      const uc = getClientContainer().listUnassigned;
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
          ID: r.id,
          [t('colCountry')]: r.country,
          [t('colLevel')]: r.level,
          [t('colClient')]: r.client ?? t('noClient'),
          [t('colRollOff')]: r.rollOff ?? '',
          [t('colDays')]: r.days ?? '',
          [t('colGroup')]: t(`group.${r.group}`),
        })),
        'desasignados.xlsx',
        t('title'),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  }

  const groupOptions = UNASSIGNED_GROUPS.map((g) => ({
    value: g,
    label: `${t(`group.${g}`)}${result ? ` (${result.counts[g]})` : ''}`,
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
            label: t('groupFilter'),
            options: groupOptions,
            value: group ?? '',
            onChange: (v) => updateParams({ group: v }),
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
          tableKey="unassigned"
          getRowClassName={(r) => ESTILO[r.group].row}
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
