'use client';

import { useMemo } from 'react';
import type { Employee } from '@/src/core/domain/employee';
import type { Period } from '@/src/core/domain/period';
import { ChartFrame, GridY, EmptyChart, escalaY, type Escala } from './chart-primitives';

const W = 860;
const H = 230;
const ML = 52;
const MR = 16;
const MT = 24;
const MB = 32;
const IW = W - ML - MR;
const IH = H - MT - MB;

interface Props {
  employees: Employee[];
  periods: Period[];
  indicePeriodoActual: number;
}

export function CapacityChart({ employees, periods, indicePeriodoActual }: Props) {
  const datos = useMemo(() => {
    return periods.map((p, i) => {
      let chg = 0;
      let sah = 0;
      for (const e of employees) {
        chg += e.chg[i] ?? 0;
        sah += e.sah[i] ?? 0;
      }
      return { label: p.label, chg, sah };
    });
  }, [employees, periods]);

  if (datos.length === 0) return <EmptyChart mensaje="Sin períodos para mostrar" />;

  const max = Math.max(...datos.map((d) => Math.max(d.chg, d.sah)));
  if (max === 0) return <EmptyChart mensaje="Sin horas cargadas" />;

  const escala: Escala = { min: 0, max: max * 1.12 };
  const bw = IW / datos.length;

  return (
    <ChartFrame viewBox={`0 0 ${W} ${H}`} ariaLabel="Horas cargables sobre horas disponibles">
      <GridY
        escala={escala}
        left={ML}
        top={MT}
        ancho={IW}
        alto={IH}
        formato={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)))}
      />

      {datos.map((d, i) => {
        const x = ML + i * bw + bw * 0.16;
        const ancho = bw * 0.68;
        const ySah = escalaY(d.sah, escala, MT, IH);
        const yChg = escalaY(d.chg, escala, MT, IH);
        const futuro = i > indicePeriodoActual;

        return (
          <g key={d.label} opacity={futuro ? 0.45 : 1}>
            <rect x={x} y={ySah} width={ancho} height={MT + IH - ySah} rx={3} fill="var(--G5)" />
            <rect x={x} y={yChg} width={ancho} height={MT + IH - yChg} rx={3} fill="var(--P)" />
            <text
              x={x + ancho / 2}
              y={MT + IH + 15}
              textAnchor="middle"
              fontSize={10}
              fill="var(--G3)"
            >
              {d.label}
            </text>
          </g>
        );
      })}

      <g>
        <rect x={ML + IW - 206} y={MT - 8} width={11} height={11} rx={2} fill="var(--P)" />
        <text x={ML + IW - 191} y={MT + 1} fontSize={10.5} fill="var(--G1)">
          Horas cargables
        </text>
        <rect x={ML + IW - 104} y={MT - 8} width={11} height={11} rx={2} fill="var(--G5)" />
        <text x={ML + IW - 89} y={MT + 1} fontSize={10.5} fill="var(--G1)">
          SAH disponible
        </text>
      </g>
    </ChartFrame>
  );
}