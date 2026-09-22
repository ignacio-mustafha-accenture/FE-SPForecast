'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import type { Employee } from '@/src/core/domain/employee';
import { EmptyChart } from './chart-kit';

interface Props {
  employees: Employee[];
  periods: Array<{ label: string }>;
  indicePeriodoActual: number;
  targetPct: number;
  limite?: number;
}

type Severidad = 'alta' | 'media';

interface Caso {
  id: string;
  nombre: string;
  country: string;
  offering: string | null;
  pct: number | null;
  motivo: string;
  severidad: Severidad;
  orden: number;
}


export function AttentionList({
  employees,
  periods,
  indicePeriodoActual,
  targetPct,
  limite = 8,
}: Props) {
  const router = useRouter();

  const casos = useMemo<Caso[]>(() => {
    const out: Caso[] = [];

    for (const e of employees) {
      const sah = e.sah[indicePeriodoActual] ?? 0;
      const chg = e.chg[indicePeriodoActual] ?? 0;
      const pct = sah > 0 ? (chg / sah) * 100 : null;

      const sinProyecto = !e.client && !e.project;
      const seLibera = e.daysToAvailable >= 0 && e.daysToAvailable <= 30;
      const bajoTarget = pct !== null && pct < targetPct;


      if (pct !== null && pct === 0 && sinProyecto) {
        out.push({
          id: e.id,
          nombre: e.name,
          country: e.country,
          offering: e.offering,
          pct,
          motivo: 'Sin asignación y sin horas cargadas',
          severidad: 'alta',
          orden: 0,
        });
      } else if (seLibera && sinProyecto) {
        out.push({
          id: e.id,
          nombre: e.name,
          country: e.country,
          offering: e.offering,
          pct,
          motivo: `Se libera en ${e.daysToAvailable} días y no tiene próximo proyecto`,
          severidad: 'alta',
          orden: 1,
        });
      } else if (seLibera) {
        out.push({
          id: e.id,
          nombre: e.name,
          country: e.country,
          offering: e.offering,
          pct,
          motivo: `Roll-off en ${e.daysToAvailable} días`,
          severidad: 'media',
          orden: 2,
        });
      } else if (bajoTarget && pct < targetPct * 0.7) {
        out.push({
          id: e.id,
          nombre: e.name,
          country: e.country,
          offering: e.offering,
          pct,
          motivo: `Cargabilidad muy por debajo del target`,
          severidad: 'media',
          orden: 3,
        });
      }
    }

    return out
      .sort((a, b) => a.orden - b.orden || (a.pct ?? 0) - (b.pct ?? 0))
      .slice(0, limite);
  }, [employees, indicePeriodoActual, targetPct, limite]);

  if (casos.length === 0)
    return <EmptyChart mensaje="Nadie requiere atención en este período" alto={120} />;

  return (
    <div className="space-y-1.5">
      {casos.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => router.push(`/all?q=${encodeURIComponent(c.nombre)}`)}
          className="flex w-full items-center gap-3 rounded-md border border-[var(--G6)] px-3 py-2 text-left transition-colors hover:border-[var(--P)] hover:bg-[var(--G6)]"
        >
          <span
            className="h-8 w-1 shrink-0 rounded-full"
            style={{
              backgroundColor: c.severidad === 'alta' ? 'var(--RD)' : 'var(--YL)',
            }}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[var(--G1)]">
              {c.nombre}
            </span>
            <span className="block truncate text-[11px] text-[var(--G3)]">
              {c.country}
              {c.offering ? ` · ${c.offering}` : ''} · {c.motivo}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-[13px] font-bold tabular-nums text-[var(--G1)]">
              {c.pct === null ? '—' : `${c.pct.toFixed(0)}%`}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}