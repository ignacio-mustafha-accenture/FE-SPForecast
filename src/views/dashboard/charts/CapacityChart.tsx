'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { Employee } from '@/src/core/domain/employee';
import type { Period } from '@/src/core/domain/period';
import { COLORS, ChartTooltip, EmptyChart, fmtHoras, fmtHorasFull } from './chart-kit';

interface Props {
  employees: Employee[];
  periods: Period[];
  indicePeriodoActual: number;
}

interface Punto {
  label: string;
  chg: number;
  sah: number;
  ocioso: number;
  pct: number;
  futuro: boolean;
}


export function CapacityChart({ employees, periods, indicePeriodoActual }: Props) {
  const datos = useMemo<Punto[]>(
    () =>
      periods.map((p, i) => {
        let chg = 0;
        let sah = 0;
        for (const e of employees) {
          chg += e.chg[i] ?? 0;
          sah += e.sah[i] ?? 0;
        }
        return {
          label: p.label,
          chg,
          sah,
          ocioso: Math.max(sah - chg, 0),
          pct: sah > 0 ? (chg / sah) * 100 : 0,
          futuro: i > indicePeriodoActual,
        };
      }),
    [employees, periods, indicePeriodoActual],
  );

  if (datos.length === 0) return <EmptyChart mensaje="Sin períodos para mostrar" alto={220} />;
  if (datos.every((d) => d.sah === 0))
    return <EmptyChart mensaje="Sin horas cargadas" alto={220} />;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={datos} margin={{ top: 14, right: 16, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id="gradChg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.85} />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={COLORS.grid} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: COLORS.grid }}
          tick={{ fontSize: 10.5, fill: COLORS.axis }}
        />
        <YAxis
          tickFormatter={fmtHoras}
          tickLine={false}
          axisLine={false}
          width={46}
          tick={{ fontSize: 11, fill: COLORS.axis }}
        />
        <Tooltip
          content={({ active, payload }) => {
            const d = payload?.[0]?.payload as Punto | undefined;
            if (!d) return null;
            return (
              <ChartTooltip
                activo={active}
                titulo={`${d.label}${d.futuro ? ' · proyectado' : ''}`}
                filas={[
                  {
                    etiqueta: 'Horas cargables',
                    valor: fmtHorasFull(d.chg),
                    color: COLORS.primary,
                    destacado: true,
                  },
                  { etiqueta: 'Capacidad ociosa', valor: fmtHorasFull(d.ocioso), color: COLORS.neutral },
                  { etiqueta: 'Total disponible', valor: fmtHorasFull(d.sah) },
                ]}
                pie={`Ocupación ${d.pct.toFixed(1)}%`}
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="chg"
          stackId="1"
          stroke={COLORS.primary}
          strokeWidth={2}
          fill="url(#gradChg)"
          animationDuration={700}
          name="Horas cargables"
        />
        <Area
          type="monotone"
          dataKey="ocioso"
          stackId="1"
          stroke={COLORS.neutral}
          strokeWidth={1}
          fill={COLORS.neutral}
          fillOpacity={0.4}
          animationDuration={700}
          name="Capacidad ociosa"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}