'use client';

import type { ReactNode } from 'react';

export const CHART_COLORS = [
  'var(--P)',
  '#6200EA',
  '#D500F9',
  '#7C4DFF',
  '#B388FF',
  '#9575CD',
];

export interface Escala {
  min: number;
  max: number;
}

export function escalaY(v: number, e: Escala, top: number, alto: number): number {
  if (e.max === e.min) return top + alto;
  const r = (v - e.min) / (e.max - e.min);
  return top + alto - r * alto;
}

export function marcas(e: Escala, cantidad = 5): number[] {
  const span = e.max - e.min;
  if (span <= 0) return [e.min];
  const crudo = span / cantidad;
  const mag = Math.pow(10, Math.floor(Math.log10(crudo)));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= crudo) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(e.min / paso) * paso; v <= e.max; v += paso) out.push(v);
  return out;
}

export function ChartFrame({
  viewBox,
  children,
  ariaLabel,
}: {
  viewBox: string;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-auto block"
    >
      {children}
    </svg>
  );
}

export function GridY({
  escala,
  left,
  top,
  ancho,
  alto,
  formato = (v: number) => String(Math.round(v)),
}: {
  escala: Escala;
  left: number;
  top: number;
  ancho: number;
  alto: number;
  formato?: (v: number) => string;
}) {
  return (
    <g>
      {marcas(escala).map((v) => {
        const y = escalaY(v, escala, top, alto);
        return (
          <g key={v}>
            <line
              x1={left}
              y1={y}
              x2={left + ancho}
              y2={y}
              stroke="var(--G5)"
              strokeWidth={1}
            />
            <text
              x={left - 8}
              y={y + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--G3)"
            >
              {formato(v)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function TargetLine({
  valor,
  escala,
  left,
  top,
  ancho,
  alto,
  etiqueta,
}: {
  valor: number;
  escala: Escala;
  left: number;
  top: number;
  ancho: number;
  alto: number;
  etiqueta: string;
}) {
  const y = escalaY(valor, escala, top, alto);
  return (
    <g>
      <line
        x1={left}
        y1={y}
        x2={left + ancho}
        y2={y}
        stroke="var(--G1)"
        strokeWidth={1.5}
        strokeDasharray="7 5"
      />
      <rect x={left + 4} y={y + 3} width={86} height={15} rx={3} fill="var(--WH)" opacity={0.9} />
      <text x={left + 9} y={y + 14} fontSize={11} fontWeight={700} fill="var(--G1)">
        {etiqueta}
      </text>
    </g>
  );
}

export function EmptyChart({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-[var(--G3)]">
      {mensaje}
    </div>
  );
}