'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

import { useForecastStore } from '@/src/store/StoreProvider';
import { getClientContainer } from '@/src/application/container';
import { KpiCard } from '@/src/components/ui/KpiCard';
import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { formatPercent, parseDDMMYY } from '@/src/lib/formatters';
import type { ForecastTotals } from '@/src/core/domain/forecast-totals';

import { ChargeabilityByPeriodChart } from '@/src/views/dashboard/charts/ChargeabilityByPeriodChart';
import { GapVsTargetChart } from '@/src/views/dashboard/charts/GapVsTargetChart';
import { CapacityChart } from '@/src/views/dashboard/charts/CapacityChart';
import { OfferingDistributionChart } from '@/src/views/dashboard/charts/OfferingDistributionChart';
import { ChargeabilityHeatmap } from '@/src/views/dashboard/charts/ChargeabilityHeatmap';


const page = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

const section = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: 'easeOut' as const } },
};

const row = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardItem = {
  hidden: { opacity: 0, x: -24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.34, ease: 'easeOut' as const } },
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

  const ptosData = useMemo(() => {
    if (!appState) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appState.employees
      .filter((e) => e.isOnPTO || e.nextPTO !== null)
      .map((e) => ({ ...e, _ptoStart: parseDDMMYY(e.nextPTO) }))
      .filter((e) => e.isOnPTO || (e._ptoStart !== null && e._ptoStart >= today))
      .sort((a, b) => (a._ptoStart?.getTime() ?? 0) - (b._ptoStart?.getTime() ?? 0));
  }, [appState]);


  const cargabilidadPonderada = useMemo(() => {
    if (!appState) return 0;
    const i = indiceDelPeriodoVigente(appState.periods, appState.period?.label);
    let chg = 0;
    let sah = 0;
    for (const e of appState.employees) {
      chg += e.chg[i] ?? 0;
      sah += e.sah[i] ?? 0;
    }
    return sah > 0 ? (chg / sah) * 100 : 0;
  }, [appState]);

  const iActual = useMemo(
    () => (appState ? indiceDelPeriodoVigente(appState.periods, appState.period?.label) : 0),
    [appState],
  );

  const target = useMemo(() => {
    if (!appState?.targets) return TARGET_POR_DEFECTO;
    const valores = Object.values(appState.targets).filter((v) => typeof v === 'number' && v > 0);
    return valores.length ? Math.max(...valores) : TARGET_POR_DEFECTO;
  }, [appState]);

  const showSkeleton = isLoading && !appState;

  return (
    <AnimatePresence mode="wait">
      {showSkeleton ? (
        <motion.div key="skeleton" variants={skeletonAnim} initial="hidden" animate="show" exit="exit">
          <DashboardSkeleton />
        </motion.div>
      ) : !appState ? (
        <motion.p
          key="empty"
          variants={skeletonAnim}
          initial="hidden"
          animate="show"
          className="text-[var(--G3)] text-sm"
        >
          {t('noData')}
        </motion.p>
      ) : (
        <motion.div key="content" variants={page} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={section}>
            <h1 className="text-xl font-bold text-[var(--BK)]">{t('title')}</h1>
            {appState.period && (
              <p className="text-sm text-[var(--G3)] mt-0.5">{appState.period.label}</p>
            )}
          </motion.div>

          <motion.div variants={row} className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              { label: t('kpiTotal'), value: String(appState.employees.length), color: undefined },
              {
                label: t('kpiChargeable'),
                value: String(appState.employees.filter((e) => e.chargeabilityStatus === 'green').length),
                color: 'var(--GR)',
              },
              {
                label: t('kpiAtRisk'),
                value: String(appState.employees.filter((e) => e.chargeabilityStatus === 'yellow').length),
                color: 'var(--YL)',
              },
              {
                label: t('kpiNotChargeable'),
                value: String(appState.employees.filter((e) => e.chargeabilityStatus === 'red').length),
                color: 'var(--RD)',
              },
              {
                label: t('kpiAvgChargeability'),
                value: formatPercent(cargabilidadPonderada),
                color: 'var(--P)',
              },
            ].map(({ label, value, color }) => (
              <motion.div key={label} variants={cardItem}>
                <KpiCard label={label} value={value} accentColor={color} />
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={section}>
            <Card>
              <CardHeader>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--G1)]">
                    Cargabilidad por período
                  </h2>
                  <p className="text-xs text-[var(--G3)] mt-0.5">
                    Horas cargables sobre horas disponibles · los períodos posteriores al vigente
                    se muestran atenuados
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
          </motion.div>

          <motion.div variants={section} className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--G1)]">
                    Brecha contra target por grupo
                  </h2>
                  <p className="text-xs text-[var(--G3)] mt-0.5">
                    {appState.period?.label} · cada grupo contra su propio target
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
                  <p className="text-xs text-[var(--G3)] mt-0.5">Composición del equipo</p>
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
                  <h2 className="text-sm font-semibold text-[var(--G1)]">
                    Capacidad en horas
                  </h2>
                  <p className="text-xs text-[var(--G3)] mt-0.5">
                    Volumen absoluto detrás del porcentaje
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
                <div>
                  <h2 className="text-sm font-semibold text-[var(--G1)]">
                    Cargabilidad individual
                  </h2>
                  <p className="text-xs text-[var(--G3)] mt-0.5">
                    Las 40 personas con menor cargabilidad promedio · una fila por persona
                  </p>
                </div>
              </CardHeader>
              <CardBody>
                <ChargeabilityHeatmap
                  employees={appState.employees}
                  periods={appState.periods}
                  indicePeriodoActual={iActual}
                  targetPct={target}
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
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--G3)] uppercase">Empleado</th>
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--G3)] uppercase">País</th>
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--G3)] uppercase">Período</th>
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--G3)] uppercase">Horas</th>
                          <th className="text-left py-2 text-xs font-semibold text-[var(--G3)] uppercase">Estado</th>
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
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
      <Skeleton className="h-56 rounded-lg" />
      <Skeleton className="h-96 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}