'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { ForecastTotals } from '@/src/core/domain/forecast-totals';
import { COLORS, ChartTooltip, DrillHint, EmptyChart, fmtHorasFull, useDrillDown } from './chart-kit';

interface Props {
  totals: ForecastTotals | null;
  indicePeriodo: number;
}

interface Fila {
  label: string;
  gap: number;
  pct: number;
  target: number;
  hc: number;
  faltan: number;
  esPais: boolean;
  country: string;
  offering?: string;
}


export function GapVsTargetChart({ totals, indicePeriodo }: Props) {
  const drill = useDrillDown();

  const datos = useMemo<Fila[]>(() => {
    if (!totals) return [];
    const out: Fila[] = [];
    for (const r of totals.rows) {
      if (r.hc <= 0) continue;
      const p = r.periods[indicePeriodo];
      if (!p || p.sah === 0) continue;
      const pct = (p.chg / p.sah) * 100;
      out.push({
        label: r.label,
        gap: pct - r.targetPct,
        pct,
        target: r.targetPct,
        hc: r.hc,
        faltan: Math.max((r.targetPct / 100) * p.sah - p.chg, 0),
        esPais: r.kind === 'country',
        country: r.country,
        offering: r.kind === 'offering' ? r.label.trim() : undefined,
      });
    }
    return out.sort((a, b) => a.gap - b.gap);
  }, [totals, indicePeriodo]);

  if (datos.length === 0) return <EmptyChart mensaje="Sin datos de totales" alto={240} />;

  const lim = Math.max(...datos.map((d) => Math.abs(d.gap))) * 1.3;

  return (
    <>
      <ResponsiveContainer width="100%" height={Math.max(datos.length * 34 + 30, 200)}>
        <BarChart
          data={datos}
          layout="vertical"
          margin={{ top: 6, right: 44, bottom: 6, left: 8 }}
          barCategoryGap="22%"
        >
          <XAxis type="number" domain={[-lim, lim]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={126}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: COLORS.ink }}
          />
          <Tooltip
            cursor={{ fill: COLORS.primary, fillOpacity: 0.05 }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as Fila | undefined;
              if (!d) return null;
              return (
                <ChartTooltip
                  activo={active}
                  titulo={d.label}
                  filas={[
                    { etiqueta: 'Cargabilidad', valor: `${d.pct.toFixed(1)}%`, destacado: true },
                    { etiqueta: 'Target del grupo', valor: `${d.target}%` },
                    {
                      etiqueta: 'Brecha',
                      valor: `${d.gap >= 0 ? '+' : ''}${d.gap.toFixed(1)} pts`,
                      color: d.gap >= 0 ? COLORS.ok : COLORS.bad,
                    },
                    { etiqueta: 'Headcount', valor: String(d.hc) },
                  ]}
                  pie={
                    d.faltan > 0
                      ? `Faltan ${fmtHorasFull(d.faltan)} horas`
                      : 'Cumple el target'
                  }
                />
              );
            }}
          />
          <ReferenceLine x={0} stroke={COLORS.axis} strokeWidth={1.4} />
          <Bar
            dataKey="gap"
            radius={[2, 2, 2, 2]}
            cursor="pointer"
            animationDuration={600}
            onClick={(d) => {
              const f = d as unknown as Fila;
              drill({ country: f.country, offering: f.offering });
            }}
          >
            {datos.map((d) => (
              <Cell key={d.label} fill={d.gap >= 0 ? COLORS.ok : COLORS.bad} />
            ))}
            <LabelList
              dataKey="gap"
              position="right"
              formatter={(v: unknown) => {
                const n = Number(v);
                return Number.isFinite(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(1)}` : '';
              }}
              style={{ fontSize: 11, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <DrillHint texto="Click en una barra para abrir ese grupo en la Vista Global" />
    </>
  );
}