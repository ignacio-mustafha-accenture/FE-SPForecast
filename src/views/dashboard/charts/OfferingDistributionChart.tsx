'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { Employee } from '@/src/core/domain/employee';
import { COLORS, SERIES, ChartTooltip, DrillHint, EmptyChart, useDrillDown } from './chart-kit';

interface Fila {
  label: string;
  n: number;
  bajoObjetivo: number;
  pctBajo: number;
}


export function OfferingDistributionChart({ employees }: { employees: Employee[] }) {
  const drill = useDrillDown();

  const datos = useMemo<Fila[]>(() => {
    const m = new Map<string, { n: number; bajo: number }>();
    for (const e of employees) {
      const k = e.offering ?? 'Sin offering';
      const cur = m.get(k) ?? { n: 0, bajo: 0 };
      cur.n += 1;
      if (e.chargeabilityStatus === 'red') cur.bajo += 1;
      m.set(k, cur);
    }
    return [...m.entries()]
      .map(([label, v]) => ({
        label,
        n: v.n,
        bajoObjetivo: v.bajo,
        pctBajo: v.n > 0 ? (v.bajo / v.n) * 100 : 0,
      }))
      .sort((a, b) => b.n - a.n);
  }, [employees]);

  if (datos.length === 0) return <EmptyChart mensaje="Sin empleados" alto={200} />;

  return (
    <>
      <ResponsiveContainer width="100%" height={Math.max(datos.length * 34 + 24, 180)}>
        <BarChart
          data={datos}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 8 }}
          barCategoryGap="24%"
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11.5, fill: COLORS.ink }}
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
                    { etiqueta: 'Personas', valor: String(d.n), destacado: true },
                    {
                      etiqueta: 'Bajo objetivo',
                      valor: `${d.bajoObjetivo} · ${d.pctBajo.toFixed(0)}%`,
                      color: d.bajoObjetivo > 0 ? COLORS.bad : COLORS.ok,
                    },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="n"
            radius={[3, 3, 3, 3]}
            cursor="pointer"
            animationDuration={600}
            onClick={(d) => {
              const f = d as unknown as Fila;
              drill({ offering: f.label === 'Sin offering' ? undefined : f.label });
            }}
          >
            {datos.map((d, i) => (
              <Cell key={d.label} fill={SERIES[i % SERIES.length]} />
            ))}
            <LabelList
              dataKey="n"
              position="right"
              style={{ fontSize: 12, fontWeight: 700, fill: COLORS.ink }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <DrillHint texto="Click en un offering para filtrar la Vista Global" />
    </>
  );
}