'use client';

import { useMemo } from 'react';
import type { ForecastTotals } from '@/src/core/domain/forecast-totals';
import { ChartFrame, EmptyChart } from './chart-primitives';

const W = 420;
const ML = 132;
const MR = 46;
const MT = 14;
const FILA = 30;

interface Props {
  totals: ForecastTotals | null;
  indicePeriodo: number;
}

export function GapVsTargetChart({ totals, indicePeriodo }: Props) {
  const filas = useMemo(() => {
    if (!totals) return [];
    return totals.rows
      .filter((r) => r.hc > 0)
      .map((r) => {
        const p = r.periods[indicePeriodo];
        const pct = p && p.sah > 0 ? (p.chg / p.sah) * 100 : null;
        return pct === null
          ? null
          : { label: r.label, kind: r.kind, gap: pct - r.targetPct, pct, target: r.targetPct };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.gap - b.gap);
  }, [totals, indicePeriodo]);

  if (filas.length === 0) return <EmptyChart mensaje="Sin datos de totales" />;

  const H = MT + filas.length * FILA + 12;
  const IW = W - ML - MR;
  const lim = Math.max(...filas.map((f) => Math.abs(f.gap))) * 1.25 || 1;
  const x0 = ML + IW / 2;

  return (
    <ChartFrame viewBox={`0 0 ${W} ${H}`} ariaLabel="Brecha contra target por grupo">
      <line x1={x0} y1={MT} x2={x0} y2={MT + filas.length * FILA} stroke="var(--G3)" strokeWidth={1.4} />

      {filas.map((f, i) => {
        const y = MT + i * FILA + FILA * 0.24;
        const alto = FILA * 0.52;
        const ancho = (Math.abs(f.gap) / lim) * (IW / 2);
        const x = f.gap >= 0 ? x0 : x0 - ancho;
        const color = f.gap >= 0 ? 'var(--GR)' : 'var(--RD)';
        const sangria = f.kind === 'offering' ? 12 : 0;

        return (
          <g key={f.label}>
            <rect x={x} y={y} width={Math.max(ancho, 1.5)} height={alto} rx={2.5} fill={color} />
            <text
              x={ML - 10}
              y={y + alto * 0.76}
              textAnchor="end"
              fontSize={11}
              fontWeight={f.kind === 'country' ? 700 : 500}
              fill="var(--G1)"
            >
              {'\u00A0'.repeat(sangria)}
              {f.label}
            </text>
            <text
              x={f.gap >= 0 ? x + ancho + 7 : x - 7}
              y={y + alto * 0.76}
              textAnchor={f.gap >= 0 ? 'start' : 'end'}
              fontSize={11}
              fontWeight={700}
              fill={color}
            >
              {f.gap >= 0 ? '+' : ''}
              {f.gap.toFixed(1)}
            </text>
          </g>
        );
      })}
    </ChartFrame>
  );
}