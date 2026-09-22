'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

import { useForecastStore } from '@/src/store/StoreProvider';
import { getClientContainer } from '@/src/application/container';
import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { parseDDMMYY } from '@/src/lib/formatters';
import type { ForecastTotals } from '@/src/core/domain/forecast-totals';
import type { Employee } from '@/src/core/domain/employee';

import { ChargeabilityByPeriodChart } from '@/src/views/dashboard/charts/ChargeabilityByPeriodChart';
import { GapVsTargetChart } from '@/src/views/dashboard/charts/GapVsTargetChart';
import { CapacityChart } from '@/src/views/dashboard/charts/CapacityChart';
import { OfferingDistributionChart } from '@/src/views/dashboard/charts/OfferingDistributionChart';
import { AttentionList } from '@/src/views/dashboard/charts/AttentionList';
import { fmtHorasFull } from '@/src/views/dashboard/charts/chart-kit';


const page = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } } };
const section = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: 'easeOut' as const } },
};
const skeletonAnim = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const TARGET_POR_DEFECTO = 87.2;


export function DashboardView() {
  const t = useTranslations('dashboard');
  const appState = useForecastStore((s) => s.appState);
  const isLoading = useForecastStore((s) => s.isLoading);

  const [totals, setTotals] = useState<ForecastTotals | null>(null);

  useEffect(() => {
    let cancelled = false;
    getClientContainer()
      .getForecastTotals.execute({}, 0)
      .then((data) => {
        if (!cancelled) setTotals(data);
      })
      .catch((err) => {
        console.warn('[DashboardView] no se pudieron obtener los totales:', err);
        if (!cancelled) setTotals(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const iActual = useMemo(
    () => (appState ? indiceDelPeriodoVigente(appState.periods, appState.period?.label) : 0),
    [appState],
  );

  const target = useMemo(() => {
    if (!appState?.targets) return TARGET_POR_DEFECTO;
    const v = Object.values(appState.targets).filter((x) => typeof x === 'number' && x > 0);
    return v.length ? Math.max(...v) : TARGET_POR_DEFECTO;
  }, [appState]);


  const metricas = useMemo(() => {
    if (!appState) return null;
    const agg = (i: number) => {
      let chg = 0;
      let sah = 0;
      for (const e of appState.employees) {
        chg += e.chg[i] ?? 0;
        sah += e.sah[i] ?? 0;
      }
      return { chg, sah, pct: sah > 0 ? (chg / sah) * 100 : 0 };
    };
    const actual = agg(iActual);
    const previo = iActual > 0 ? agg(iActual - 1) : null;
    return {
      ...actual,
      delta: previo ? actual.pct - previo.pct : null,
      faltan: Math.max((target / 100) * actual.sah - actual.chg, 0),
    };
  }, [appState, iActual, target]);

  const ptosData = useMemo(() => {
    if (!appState) return [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return appState.employees
      .filter((e) => e.isOnPTO || e.nextPTO !== null)
      .map((e) => ({ ...e, _ptoStart: parseDDMMYY(e.nextPTO) }))
      .filter((e) => e.isOnPTO || (e._ptoStart !== null && e._ptoStart >= hoy))
      .sort((a, b) => (a._ptoStart?.getTime() ?? 0) - (b._ptoStart?.getTime() ?? 0));
  }, [appState]);

  const showSkeleton = isLoading && !appState;

  return (
    <AnimatePresence mode="wait">
      {showSkeleton ? (
        <motion.div key="sk" variants={skeletonAnim} initial="hidden" animate="show" exit="exit">
          <DashboardSkeleton />
        </motion.div>
      ) : !appState || !metricas ? (
        <motion.p
          key="empty"
          variants={skeletonAnim}
          initial="hidden"
          animate="show"
          className="text-sm text-[var(--G3)]"
        >
          {t('noData')}
        </motion.p>
      ) : (
        <motion.div key="c" variants={page} initial="hidden" animate="show" className="space-y-5">
          <motion.div variants={section} className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-[var(--BK)]">{t('title')}</h1>
              {appState.period && (
                <p className="mt-0.5 text-sm text-[var(--G3)]">{appState.period.label}</p>
              )}
            </div>
            <div className="rounded-md bg-[var(--P)] px-4 py-2 text-sm font-bold text-white">
              Target {target}%
            </div>
          </motion.div>

          <motion.div variants={section}>
            <Card>
              <CardBody>
                <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--P)]">
                      Cargabilidad del período
                    </p>
                    <div className="mt-1 flex items-baseline gap-3">
                      <span className="text-[44px] font-extrabold leading-none text-[var(--G1)]">
                        {metricas.pct.toFixed(1)}%
                      </span>
                      {metricas.delta !== null && (
                        <span
                          className="text-sm font-bold"
                          style={{
                            color: metricas.delta >= 0 ? 'var(--GR)' : 'var(--RD)',
                          }}
                        >
                          {metricas.delta >= 0 ? '▲' : '▼'} {Math.abs(metricas.delta).toFixed(1)} pts
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--G3)]">
                      {metricas.faltan > 0
                        ? `Faltan ${fmtHorasFull(metricas.faltan)} horas para el target`
                        : 'Por encima del target'}
                      {metricas.delta !== null && ' · variación contra el período anterior'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <Mini label="Equipo" valor={String(appState.employees.length)} />
                    <Mini
                      label="En objetivo"
                      valor={String(contar(appState.employees, 'green'))}
                      color="var(--GR)"
                    />
                    <Mini
                      label="En riesgo"
                      valor={String(contar(appState.employees, 'yellow'))}
                      color="var(--YL)"
                    />
                    <Mini
                      label="Bajo objetivo"
                      valor={String(contar(appState.employees, 'red'))}
                      color="var(--RD)"
                    />
                    <Mini label="Horas cargables" valor={fmtHorasFull(metricas.chg)} />
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>

          <motion.div variants={section} className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardHeader>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--G1)]">
                    Evolución de la cargabilidad
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--G3)]">
                    Horas cargables sobre disponibles · los períodos posteriores al vigente son
                    proyección
                  </p>
                </div>
              </CardHeader>
              <CardBody>
                <ChargeabilityByPeriodChart
                  employees={appState.employees}
                  periods={appState.periods}
                  indicePeriodoActual={iActual}
                  targetPct={target}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-[var(--G1)]">Requieren atención</h2>
                <p className="mt-0.5 text-xs text-[var(--G3)]">
                  Ordenado por urgencia · click para ver a la persona
                </p>
              </CardHeader>
              <CardBody>
                <AttentionList
                  employees={appState.employees}
                  periods={appState.periods}
                  indicePeriodoActual={iActual}
                  targetPct={target}
                />
              </CardBody>
            </Card>
          </motion.div>

          <motion.div variants={section} className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--G1)]">Brecha por grupo</h2>
                  <p className="mt-0.5 text-xs text-[var(--G3)]">
                    Cada país y offering contra su propio target
                  </p>
                </div>
              </CardHeader>
              <CardBody>
                <GapVsTargetChart totals={totals} indicePeriodo={0} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--G1)]">Personas por offering</h2>
                  <p className="mt-0.5 text-xs text-[var(--G3)]">
                    Pasá el cursor para ver cuántas están bajo objetivo
                  </p>
                </div>
              </CardHeader>
              <CardBody>
                <OfferingDistributionChart employees={appState.employees} />
              </CardBody>
            </Card>
          </motion.div>

          <motion.div variants={section}>
            <Card>
              <CardHeader>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--G1)]">Capacidad del equipo</h2>
                  <p className="mt-0.5 text-xs text-[var(--G3)]">
                    El área gris es capacidad disponible sin facturar
                  </p>
                </div>
              </CardHeader>
              <CardBody>
                <CapacityChart
                  employees={appState.employees}
                  periods={appState.periods}
                  indicePeriodoActual={iActual}
                />
              </CardBody>
            </Card>
          </motion.div>

          <motion.div variants={section}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--G1)]">Próximas vacaciones</h2>
                  {ptosData.length > 0 && <Badge variant="neutral">{ptosData.length}</Badge>}
                </div>
              </CardHeader>
              <CardBody>
                {ptosData.length === 0 ? (
                  <p className="text-sm text-[var(--G3)]">No hay vacaciones próximas</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--G5)]">
                          {['Empleado', 'País', 'Período', 'Horas', 'Estado'].map((h) => (
                            <th
                              key={h}
                              className="py-2 pr-4 text-left text-xs font-semibold uppercase text-[var(--G3)]"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ptosData.map((e) => (
                          <tr key={e.id} className="border-b border-[var(--G6)] hover:bg-[var(--G6)]">
                            <td className="py-2 pr-4 font-medium text-[var(--G1)]">{e.name}</td>
                            <td className="py-2 pr-4 text-[var(--G3)]">{e.country}</td>
                            <td className="py-2 pr-4 text-[var(--G3)]">
                              {e.nextPTO} – {e.nextPTOEnd ?? '—'}
                            </td>
                            <td className="py-2 pr-4 text-[var(--G3)]">{e.nextPTOHours ?? '—'}h</td>
                            <td className="py-2">
                              {e.isOnPTO ? (
                                <Badge variant="yellow">En curso</Badge>
                              ) : (
                                <Badge variant="neutral">Próximo</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


function Mini({ label, valor, color }: { label: string; valor: string; color?: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--G3)]">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums" style={{ color: color ?? 'var(--G1)' }}>
        {valor}
      </p>
    </div>
  );
}

function contar(employees: Employee[], estado: Employee['chargeabilityStatus']): number {
  return employees.filter((e) => e.chargeabilityStatus === estado).length;
}

function indiceDelPeriodoVigente(
  periods: Array<{ label: string }>,
  labelActual: string | undefined,
): number {
  if (!labelActual) return 0;
  const i = periods.findIndex((p) => p.label === labelActual);
  return i >= 0 ? i : 0;
}


function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-28 rounded-lg" />
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}