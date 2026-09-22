'use client';

import { useMemo } from 'react';
import type { Employee } from '@/src/core/domain/employee';
import { ChartFrame, EmptyChart } from './chart-primitives';

const W = 420;
const ML = 118;
const MR = 44;
const MT = 8;
const FILA = 30;

export function OfferingDistributionChart({ employees }: { employees: Employee[] }) {
  const filas = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const e of employees) {
      const k = e.offering ?? 'Sin offering';
      conteo.set(k, (conteo.get(k) ?? 0) + 1);
    }
    return [...conteo.entries()]
      .map(([label, n]) => ({ label, n }))
      .sort((a, b) => b.n - a.n);
  }, [employees]);

  if (filas.length === 0) return <EmptyChart mensaje="Sin empleados" />;

  const H = MT + filas.length * FILA + 8;
  const IW = W - ML - MR;
  const max = Math.max(...filas.map((f) => f.n));

  return (
    <ChartFrame viewBox={`0 0 ${W} ${H}`} ariaLabel="Distribución de personas por offering">
      {filas.map((f, i) => {
        const y = MT + i * FILA + FILA * 0.22;
        const alto = FILA * 0.56;
        const ancho = (f.n / (max * 1.16)) * IW;
        return (
          <g key={f.label}>
            <rect x={ML} y={y} width={Math.max(ancho, 2)} height={alto} rx={3} fill="var(--P)" />
            <text
              x={ML - 10}
              y={y + alto * 0.76}
              textAnchor="end"
              fontSize={11.5}
              fill="var(--G1)"
            >
              {f.label}
            </text>
            <text
              x={ML + ancho + 8}
              y={y + alto * 0.76}
              fontSize={12}
              fontWeight={700}
              fill="var(--G1)"
            >
              {f.n}
            </text>
          </g>
        );
      })}
    </ChartFrame>
  );
}