'use client';

import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';

import type { Employee } from '@/src/core/domain/employee';
import type { Period } from '@/src/core/domain/period';
import {
  COLORS,
  ChartTooltip,
  DrillHint,
  EmptyChart,
  fmtHorasFull,
  useDrillDown,
} from './chart-kit';

interface Props {
  employees: Employee[];
  periods: Period[];
  indicePeriodoActual: number;
  targetPct: number;
}

interface Punto {
  label: string;
  pct: number;
  gap: number;
  chg: number;
  sah: number;
  faltan: number;
  futuro: boolean;
  actual: boolean;
}

export function ChargeabilityByPeriodChart({
  employees,
  periods,
  indicePeriodoActual,
  targetPct,
}: Props) {
  const drill = useDrillDown();

  const datos = useMemo<Punto[]>(
    () =>
      periods.map((p, i) => {
        let chg = 0;
        let sah = 0;
        for (const e of employees) {
          chg += e.chg[i] ?? 0;
          sah += e.sah[i] ?? 0;
        }
        const pct = sah > 0 ? (chg / sah) * 100 : 0;
        return {
          label: p.label,
          pct,
          gap: pct - targetPct,
          chg,
          sah,
          faltan: Math.max((targetPct / 100) * sah - chg, 0),
          futuro: i > indicePeriodoActual,
          actual: i === indicePeriodoActual,
        };
      }),
    [employees, periods, indicePeriodoActual, targetPct],
  );

  if (datos.length === 0) return <EmptyChart mensaje="Sin períodos para mostrar" alto={280} />;

  const tope = Math.max(...datos.map((d) => d.pct), targetPct) * 1.18;

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={datos} margin={{ top: 28, right: 16, bottom: 4, left: 0 }}>
          <ReferenceArea y1={0} y2={targetPct} fill={COLORS.primary} fillOpacity={0.04} />
          <CartesianGrid vertical={false} stroke={COLORS.grid} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: COLORS.grid }}
            tick={{ fontSize: 11, fill: COLORS.axis }}
          />
          <YAxis
            domain={[0, tope]}
            tickFormatter={(v: number) => `${Math.round(v)}%`}
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fontSize: 11, fill: COLORS.axis }}
          />
          <Tooltip
            cursor={{ fill: COLORS.primary, fillOpacity: 0.06 }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as Punto | undefined;
              if (!d) return null;
              return (
                <ChartTooltip
                  activo={active}
                  titulo={`${d.label}${d.futuro ? ' · proyectado' : ''}`}
                  filas={[
                    { etiqueta: 'Cargabilidad', valor: `${d.pct.toFixed(1)}%`, destacado: true },
                    {
                      etiqueta: 'Contra target',
                      valor: `${d.gap >= 0 ? '+' : ''}${d.gap.toFixed(1)} pts`,
                      color: d.gap >= 0 ? COLORS.ok : COLORS.bad,
                    },
                    { etiqueta: 'Horas cargables', valor: fmtHorasFull(d.chg) },
                    { etiqueta: 'Horas disponibles', valor: fmtHorasFull(d.sah) },
                  ]}
                  pie={
                    d.faltan > 0
                      ? `Faltan ${fmtHorasFull(d.faltan)} horas para alcanzar el target`
                      : 'Por encima del target'
                  }
                />
              );
            }}
          />

          <Bar
            dataKey="pct"
            radius={[3, 3, 0, 0]}
            maxBarSize={56}
            cursor="pointer"
            animationDuration={650}
            onClick={(d) => {
              const p = d as unknown as Punto;
              drill(p.pct < targetPct ? { chg_bucket: '<100' } : {});
            }}
          >
            {datos.map((d) => (
              <Cell
                key={d.label}
                fill={
                  d.pct >= targetPct
                    ? COLORS.primary
                    : d.pct >= targetPct * 0.8
                      ? COLORS.primaryMid
                      : COLORS.primarySoft
                }
                fillOpacity={d.futuro ? 0.5 : 1}
                stroke={d.actual ? COLORS.primaryDark : undefined}
                strokeWidth={d.actual ? 2 : 0}
              />
            ))}
          </Bar>

          <Line
            type="monotone"
            dataKey="pct"
            stroke={COLORS.primaryDark}
            strokeWidth={1.6}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />

          <ReferenceLine
            y={targetPct}
            stroke={COLORS.ink}
            strokeDasharray="7 5"
            strokeWidth={1.5}
            label={{
              value: `Target ${targetPct}%`,
              position: 'right',
              fontSize: 11,
              fontWeight: 700,
              fill: COLORS.ink,
            }}
          />

          {indicePeriodoActual >= 0 && indicePeriodoActual < datos.length - 1 && (
            <ReferenceLine
              x={datos[indicePeriodoActual].label}
              stroke={COLORS.axis}
              strokeDasharray="3 4"
              label={{
                value: 'proyectado →',
                position: 'insideTopRight',
                fontSize: 10.5,
                fill: COLORS.axis,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <DrillHint texto="Click en una barra bajo target para ver a esas personas en la Vista Global" />
    </>
  );
}