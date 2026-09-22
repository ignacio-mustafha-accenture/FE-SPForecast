'use client';

import { useMemo } from 'react';
import type { Employee } from '@/src/core/domain/employee';
import type { Period } from '@/src/core/domain/period';
import { ChartFrame, EmptyChart } from './chart-primitives';

const W = 860;
const ML = 156;
const MR = 12;
const MT = 30;
const FILA = 15;
const LEYENDA = 26;

interface Props {
  employees: Employee[];
  periods: Period[];
  indicePeriodoActual: number;
  targetPct: number;
  maxFilas?: number;
}

function color(pct: number | null, target: number): string {
  if (pct === null) return 'var(--G6)';
  if (pct >= 100) return '#5B00A8';
  if (pct >= target) return 'var(--P)';
  if (pct >= 70) return '#D4A5F0';
  if (pct > 0) return '#F0DCFA';
  return '#FAFAFA';
}


export function ChargeabilityHeatmap({
  employees,
  periods,
  indicePeriodoActual,
  targetPct,
  maxFilas = 40,
}: Props) {
  const filas = useMemo(() => {
    return employees
      .map((e) => {
        const celdas = periods.map((_, i) => {
          const sah = e.sah[i] ?? 0;
          const chg = e.chg[i] ?? 0;
          return sah > 0 ? (chg / sah) * 100 : null;
        });
        const conDato = celdas.filter((c): c is number => c !== null);
        const prom = conDato.length ? conDato.reduce((a, b) => a + b, 0) / conDato.length : 0;
        return { nombre: e.name, celdas, prom };
      })
      .sort((a, b) => a.prom - b.prom)
      .slice(0, maxFilas);
  }, [employees, periods, maxFilas]);

  if (filas.length === 0 || periods.length === 0)
    return <EmptyChart mensaje="Sin datos para mostrar" />;

  const H = MT + filas.length * FILA + LEYENDA;
  const cw = (W - ML - MR) / periods.length;

  const leyenda: Array<[string, string]> = [
    ['Sin dato', 'var(--G6)'],
    ['< 70%', '#F0DCFA'],
    [`70 – ${targetPct}%`, '#D4A5F0'],
    [`≥ ${targetPct}%`, 'var(--P)'],
    ['≥ 100%', '#5B00A8'],
  ];

  return (
    <ChartFrame viewBox={`0 0 ${W} ${H}`} ariaLabel="Cargabilidad individual por período">
      {periods.map((p, i) => (
        <text
          key={p.label}
          x={ML + i * cw + cw / 2}
          y={MT - 10}
          textAnchor="middle"
          fontSize={9.5}
          fill="var(--G3)"
        >
          {p.label}
        </text>
      ))}

      {filas.map((f, r) => (
        <g key={f.nombre}>
          <text x={ML - 8} y={MT + r * FILA + 11} textAnchor="end" fontSize={9.5} fill="var(--G1)">
            {f.nombre.length > 26 ? `${f.nombre.slice(0, 25)}…` : f.nombre}
          </text>
          {f.celdas.map((v, i) => (
            <rect
              key={i}
              x={ML + i * cw}
              y={MT + r * FILA}
              width={cw - 1.5}
              height={FILA - 2.5}
              rx={2}
              fill={color(v, targetPct)}
            >
              <title>{`${f.nombre} · ${periods[i].label} · ${v === null ? 'sin dato' : `${v.toFixed(0)}%`}`}</title>
            </rect>
          ))}
        </g>
      ))}

      {indicePeriodoActual >= 0 && indicePeriodoActual < periods.length - 1 && (
        <line
          x1={ML + (indicePeriodoActual + 1) * cw}
          y1={MT - 6}
          x2={ML + (indicePeriodoActual + 1) * cw}
          y2={MT + filas.length * FILA}
          stroke="var(--G1)"
          strokeWidth={1.4}
          strokeDasharray="3 4"
        />
      )}

      <g>
        {leyenda.map(([txt, c], i) => (
          <g key={txt}>
            <rect x={ML + i * 104} y={MT + filas.length * FILA + 8} width={11} height={11} rx={2} fill={c} />
            <text
              x={ML + i * 104 + 16}
              y={MT + filas.length * FILA + 17.5}
              fontSize={10}
              fill="var(--G3)"
            >
              {txt}
            </text>
          </g>
        ))}
      </g>
    </ChartFrame>
  );
}