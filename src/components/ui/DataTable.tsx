'use client';

import { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type ColumnOrderState,
  type Header,
  type RowData,
} from '@tanstack/react-table';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from 'next-intl';

import { cn } from '@/src/lib/cn';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  tableKey?: string;
  className?: string;
  pagination?: PaginationProps;
  onRowClick?: (row: TData) => void;
  getRowClassName?: (row: TData) => string;
}

const rowVariants = {
  hidden: { opacity: 0, y: 5 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.20, ease: 'easeOut' as const, delay: Math.min(i * 0.035, 0.35) },
  }),
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

function DraggableHeader<TData extends RowData>({ header }: { header: Header<TData, unknown> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.id,
  });

  return (
    <th
      ref={setNodeRef}
      style={{
        width: header.getSize(),
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="bg-[var(--G6)] px-3 py-2 text-left text-xs font-semibold text-[var(--G2)] uppercase tracking-wide whitespace-nowrap select-none"
      {...attributes}
      {...listeners}
    >
      <span
        className={cn('flex items-center gap-1', header.column.getCanSort() && 'cursor-pointer hover:text-[var(--BK)]')}
        onClick={header.column.getToggleSortingHandler()}
      >
        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
        {header.column.getIsSorted() === 'asc' && ' ↑'}
        {header.column.getIsSorted() === 'desc' && ' ↓'}
      </span>
    </th>
  );
}

export function DataTable<TData>({ data, columns, className, pagination, onRowClick, getRowClassName }: DataTableProps<TData>) {
  const t = useTranslations('common');
  const dndId = useId();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
    columns.map((c) => c.id as string),
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnOrder },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setColumnOrder((prev) => {
        const oldIdx = prev.indexOf(active.id as string);
        const newIdx = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  const PAGE_SIZES = [10, 25, 50, 100];

  return (
    <div className="space-y-2">
      <div className={cn('overflow-x-auto rounded-lg border border-[var(--G5)]', className)}>
        <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="min-w-full divide-y divide-[var(--G5)] text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                    {hg.headers.map((header) => (
                      <DraggableHeader key={header.id} header={header} />
                    ))}
                  </SortableContext>
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[var(--G5)] bg-white">
              <AnimatePresence mode="sync">
                {table.getRowModel().rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    custom={index}
                    variants={rowVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      'transition-colors duration-120',
                      onRowClick && 'cursor-pointer',
                      getRowClassName ? getRowClassName(row.original) : 'hover:bg-[var(--G6)]',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5 text-[var(--G1)] whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-10 text-center text-[var(--G3)]">
                    {t('noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DndContext>
      </div>

      {pagination && (pagination.pages > 1 || pagination.onPageSizeChange) && (
        <div className={`flex items-center px-1 text-sm text-[var(--G2)] ${pagination.pages > 1 ? 'justify-between' : 'justify-end'}`}>
          {pagination.pages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-2.5 py-1 rounded border border-[var(--G5)] disabled:opacity-40 hover:enabled:bg-[var(--G6)] transition-colors"
              >
                {t('previous')}
              </button>
              <span className="whitespace-nowrap">
                {t('page')} {pagination.page} {t('of')} {pagination.pages}
                <span className="text-[var(--G3)] ml-1">({pagination.total} {t('results')})</span>
              </span>
              <button
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-2.5 py-1 rounded border border-[var(--G5)] disabled:opacity-40 hover:enabled:bg-[var(--G6)] transition-colors"
              >
                {t('next')}
              </button>
            </div>
          )}
          {pagination.onPageSizeChange && (
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange!(Number(e.target.value))}
              className="border border-[var(--G5)] rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-[var(--P)]"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s} {t('perPage')}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
