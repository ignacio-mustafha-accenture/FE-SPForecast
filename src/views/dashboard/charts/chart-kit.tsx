'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export const COLORS = {
  primary: '#A100FF',
  primaryDark: '#6B00AD',
  primaryMid: '#BE6BF0',
  primarySoft: '#DDBBF4',
  grid: '#E8E8E8',
  axis: '#767676',
  ink: '#1A1A1A',
  ok: '#0E7A4C',
  warn: '#9A6B00',
  bad: '#B3261E',
  neutral: '#D4D4D4',
} as const;

export const SERIES = [
  COLORS.primary,
  COLORS.primaryDark,
  '#D500F9',
  '#7C4DFF',
  '#B388FF',
  '#9575CD',
] as const;


export function useDrillDown() {
  const router = useRouter();

  return useCallback(
    (filtros: Record<string, string | number | undefined>) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(filtros)) {
        if (v !== undefined && v !== '') qs.set(k, String(v));
      }
      const query = qs.toString();
      router.push(query ? `/all?${query}` : '/all');
    },
    [router],
  );
}

export interface FilaTooltip {
  etiqueta: string;
  valor: string;
  color?: string;
  destacado?: boolean;
}

export function ChartTooltip({
  activo,
  titulo,
  filas,
  pie,
}: {
  activo?: boolean;
  titulo?: string;
  filas: FilaTooltip[];
  pie?: ReactNode;
}) {
  if (!activo) return null;
  return (
    <div className="rounded-md border border-[var(--G5)] bg-white px-3 py-2 shadow-lg">
      {titulo && (
        <p className="mb-1.5 text-xs font-bold text-[var(--G1)]">{titulo}</p>
      )}
      <div className="space-y-0.5">
        {filas.map((f) => (
          <div key={f.etiqueta} className="flex items-center gap-3 text-xs">
            {f.color && (
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: f.color }}
              />
            )}
            <span className="text-[var(--G3)]">{f.etiqueta}</span>
            <span
              className={`ml-auto tabular-nums ${
                f.destacado ? 'font-bold text-[var(--G1)]' : 'font-medium text-[var(--G2)]'
              }`}
            >
              {f.valor}
            </span>
          </div>
        ))}
      </div>
      {pie && <div className="mt-1.5 border-t border-[var(--G6)] pt-1.5 text-[11px] text-[var(--G3)]">{pie}</div>}
    </div>
  );
}

export function DrillHint({ texto }: { texto: string }) {
  return (
    <p className="mt-2 text-[11px] text-[var(--G3)]">
      <span aria-hidden>↗</span> {texto}
    </p>
  );
}

export function EmptyChart({ mensaje, alto = 160 }: { mensaje: string; alto?: number }) {
  return (
    <div
      className="flex items-center justify-center text-sm text-[var(--G3)]"
      style={{ height: alto }}
    >
      {mensaje}
    </div>
  );
}

export const fmtPct = (v: number) => `${v.toFixed(1)}%`;
export const fmtHoras = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
export const fmtHorasFull = (v: number) =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(v);