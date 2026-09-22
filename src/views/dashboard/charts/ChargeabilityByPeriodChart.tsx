'use client';

import { useMemo } from 'react';
import type { Employee } from '@/src/core/domain/employee';
import type { Period } from '@/src/core/domain/period';
import {
  ChartFrame,
  GridY,
  TargetLine,
  EmptyChart,
  escalaY,
  type Escala,
} from './chart-primitives';

const W = 860;
const H = 260;
const ML = 44;
const MR = 16;
const MT = 26;
const MB = 34;
const IW = W - ML - MR;
const IH = H - MT - MB;

interface Props {
  employees: Employee[];
  periods: Period[];
  indicePeriodoActual: number;
  targetPct: number;
}

export function ChargeabilityByPeriodChart({
  employees,
  periods,
  indicePeriodoActual,
  targetPct,
}: Props) {
  const datos = useMemo(() => {
    return periods.map((p, i) => {
      let chg = 0;
      let sah = 0;
      for (const e of employees) {
        chg += e.chg[i] ?? 0;
        sah += e.sah[i] ?? 0;
      }
      return { label: p.label, pct: sah > 0 ? (chg / sah) * 100 : 0, sah };
    });
  }, [employees, periods]);

  if (datos.length === 0) return <EmptyChart mensaje="Sin períodos para mostrar" />;

  const maxVal = Math.max(...datos.map((d) => d.pct), targetPct);
  const escala: Escala = { min: 0, max: maxVal * 1.16 };
  const bw = IW / datos.length;

  return (
    <ChartFrame viewBox={`0 0 ${W} ${H}`} ariaLabel="Cargabilidad por período contra target">
      <GridY
        escala={escala}
        left={ML}
        top={MT}
        ancho={IW}
        alto={IH}
        formato={(v) => `${Math.round(v)}%`}
      />

      {datos.map((d, i) => {
        const y = escalaY(d.pct, escala, MT, IH);
        const alto = MT + IH - y;
        const x = ML + i * bw + bw * 0.17;
        const ancho = bw * 0.66;
        const futuro = i > indicePeriodoActual;
        const cumple = d.pct >= targetPct;
        const sinDato = d.sah === 0;

        return (
          <g key={d.label} opacity={futuro ? 0.45 : 1}>
            {!sinDato && (
              <>
                <rect
                  x={x}
                  y={y}
                  width={ancho}
                  height={Math.max(alto, 1)}
                  rx={3}
                  fill={cumple ? 'var(--P)' : '#D7A6F5'}
                />
                <text
                  x={x + ancho / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="var(--G1)"
                >
                  {d.pct.toFixed(1)}
                </text>
              </>
            )}
            {i === indicePeriodoActual && !sinDato && (
              <rect
                x={x - 2}
                y={y - 2}
                width={ancho + 4}
                height={alto + 2}
                rx={4}
                fill="none"
                stroke="var(--PD, #7B00C4)"
                strokeWidth={2}
              />
            )}
            <text
              x={x + ancho / 2}
              y={MT + IH + 16}
              textAnchor="middle"
              fontSize={10.5}
              fill="var(--G3)"
            >
              {d.label}
            </text>
          </g>
        );
      })}

      <TargetLine
        valor={targetPct}
        escala={escala}
        left={ML}
        top={MT}
        ancho={IW}
        alto={IH}
        etiqueta={`Target ${targetPct}%`}
      />

      {indicePeriodoActual >= 0 && indicePeriodoActual < datos.length - 1 && (
        <g>
          <line
            x1={ML + (indicePeriodoActual + 1) * bw}
            y1={MT - 6}
            x2={ML + (indicePeriodoActual + 1) * bw}
            y2={MT + IH}
            stroke="var(--G3)"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <text
            x={ML + (indicePeriodoActual + 1) * bw + 6}
            y={MT - 10}
            fontSize={10}
            fill="var(--G3)"
          >
            proyectado
          </text>
        </g>
      )}
    </ChartFrame>
  );
}