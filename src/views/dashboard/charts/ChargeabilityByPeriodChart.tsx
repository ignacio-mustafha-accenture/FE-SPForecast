'use client';

import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';

import { getTargetForCountry } from '@/src/lib/status';
import type { Country, Employee } from '@/src/core/domain/employee';
import type { Period } from '@/src/core/domain/period';
import {
  COLORS,
  ChartTooltip,
  EmptyChart,
  fmtHorasFull,
} from './chart-kit';

interface Props {
  employees: Employee[];
  periods: Period[];
  indicePeriodoActual: number;
  targetPct: number;
  targets?: Record<string, number>;
  indiceSeleccionado?: number;
  onSelectPeriodo?: (i: number) => void;
}

interface Punto {
  label: string;
  pct: number;
  pctReal: number;
  pctHl: number;
  pctSl: number;
  gap: number;
  chg: number;
  chgHl: number;
  chgSl: number;
  sah: number;
  faltan: number;
  futuro: boolean;
  actual: boolean;
}

const SEG = {
  real: { sel: '#A100FF', unsel: '#DDBBF4' },
  hl:   { sel: '#F59E0B', unsel: '#FDE68A' },
  sl:   { sel: '#3B82F6', unsel: '#BFDBFE' },
} as const;

const PAIS_COLOR: Record<Country, string> = {
  AR: COLORS.ink,
  MX: '#0070C0',
  CR: COLORS.ok,
};
const PAIS_DASH: Record<Country, string> = {
  AR: '7 4',
  MX: '4 4',
  CR: '2 3',
};

export function ChargeabilityByPeriodChart({
  employees,
  periods,
  indicePeriodoActual,
  targetPct,
  targets,
  indiceSeleccionado,
  onSelectPeriodo,
}: Props) {
  const datos = useMemo<Punto[]>(
    () =>
      periods.map((p, i) => {
        let chg = 0, sah = 0, chgHl = 0, chgSl = 0;
        for (const e of employees) {
          chg    += e.chg[i]   ?? 0;
          sah    += e.sah[i]   ?? 0;
          chgHl  += e.chgHl[i] ?? 0;
          chgSl  += e.chgSl[i] ?? 0;
        }
        const pct     = sah > 0 ? (chg / sah) * 100 : 0;
        const pctHl   = sah > 0 ? (chgHl / sah) * 100 : 0;
        const pctSl   = sah > 0 ? (chgSl / sah) * 100 : 0;
        const pctReal = Math.max(pct - pctHl - pctSl, 0);
        return {
          label: p.label,
          pct, pctReal, pctHl, pctSl,
          gap: pct - targetPct,
          chg, chgHl, chgSl, sah,
          faltan: Math.max((targetPct / 100) * sah - chg, 0),
          futuro: i > indicePeriodoActual,
          actual: i === indicePeriodoActual,
        };
      }),
    [employees, periods, indicePeriodoActual, targetPct],
  );

  const lineasTarget = useMemo(() => {
    if (!targets) return [{ pct: targetPct, label: `${targetPct}%`, color: COLORS.ink, dash: '7 4' }];
    const paises = [...new Set(employees.map((e) => e.country as Country))];
    return paises
      .map((c) => {
        const pct = getTargetForCountry(c, targets);
        return { pct, label: `${c} ${pct}%`, color: PAIS_COLOR[c] ?? COLORS.ink, dash: PAIS_DASH[c] ?? '7 4' };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [employees, targets, targetPct]);

  if (datos.length === 0) return <EmptyChart mensaje="Sin períodos para mostrar" alto={280} />;

  const maxTarget = Math.max(...lineasTarget.map((l) => l.pct));
  const tope = Math.max(...datos.map((d) => d.pct), maxTarget) * 1.18;

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={datos} margin={{ top: 28, right: 72, bottom: 4, left: 0 }}>
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
                    { etiqueta: '· HL', valor: `${d.pctHl.toFixed(1)}%  (${fmtHorasFull(d.chgHl)} h)`, color: SEG.hl.sel },
                    { etiqueta: '· SL', valor: `${d.pctSl.toFixed(1)}%  (${fmtHorasFull(d.chgSl)} h)`, color: SEG.sl.sel },
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

          {(['real', 'hl', 'sl'] as const).map((seg, segIdx) => (
            <Bar
              key={seg}
              dataKey={seg === 'real' ? 'pctReal' : seg === 'hl' ? 'pctHl' : 'pctSl'}
              stackId="a"
              radius={segIdx === 2 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={56}
              cursor="pointer"
              animationDuration={650}
              onClick={(_d, index) => { onSelectPeriodo?.(index); }}
            >
              {datos.map((_d, i) => {
                const isSelected = indiceSeleccionado === i;
                const fill = isSelected ? SEG[seg].sel : SEG[seg].unsel;
                return <Cell key={i} fill={fill} style={{ fill, transition: 'fill 0.35s ease' }} />;
              })}
            </Bar>
          ))}

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

          {lineasTarget.map((l) => (
            <ReferenceLine
              key={l.label}
              y={l.pct}
              stroke={l.color}
              strokeDasharray={l.dash}
              strokeWidth={1.5}
              label={{
                value: l.label,
                position: 'right',
                fontSize: 11,
                fontWeight: 700,
                fill: l.color,
              }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}