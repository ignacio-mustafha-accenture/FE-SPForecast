'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

import { useForecastStore } from '@/src/store/StoreProvider';
import { getClientContainer } from '@/src/application/container';
import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { FilterBar } from '@/src/components/ui/FilterBar';
import { parseDDMMYY } from '@/src/lib/formatters';
import { getTargetForCountry } from '@/src/lib/status';
import { OFFERING_OPTIONS } from '@/src/core/domain/offerings';
import type { ForecastTotals } from '@/src/core/domain/forecast-totals';
import type { Country, Employee } from '@/src/core/domain/employee';

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
  const searchParams = useSearchParams();
  const router = useRouter();

  const country = searchParams.get('country') ?? '';
  const offering = searchParams.get('offering') ?? '';
  const filterLevel = searchParams.get('level') ?? '';

  const activeCountries = useMemo(() => (country ? country.split(',') : []), [country]);
  const activeLevels = useMemo(() => (filterLevel ? filterLevel.split(',') : []), [filterLevel]);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    value ? p.set(key, value) : p.delete(key);
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  function toggleCountry(v: string) {
    const current = country ? country.split(',') : [];
    const next = current.includes(v) ? current.filter((c) => c !== v) : [...current, v];
    setParam('country', next.join(','));
  }

  const activeFilterCount = useMemo(() => {
    let n = activeCountries.length + activeLevels.length;
    if (offering) n += 1;
    return n;
  }, [activeCountries, activeLevels, offering]);

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

  const [iSelected, setISelected] = useState(0);
  useEffect(() => { setISelected(iActual); }, [iActual]);

  const target = useMemo(() => {
    if (!appState?.targets) return TARGET_POR_DEFECTO;
    const v = Object.values(appState.targets).filter((x) => typeof x === 'number' && x > 0);
    return v.length ? Math.max(...v) : TARGET_POR_DEFECTO;
  }, [appState]);

  const LEVEL_OPTIONS = [
    { value: '6',  label: '6' },
    { value: '7',  label: '7' },
    { value: '8',  label: '8' },
    { value: '9',  label: '9' },
    { value: '10', label: '10' },
    { value: '11', label: '11' },
    { value: '12', label: '12' },
    { value: '13', label: '13' },
  ];

  function toggleLevel(v: string) {
    const current = filterLevel ? filterLevel.split(',') : [];
    const next = current.includes(v) ? current.filter((l) => l !== v) : [...current, v];
    setParam('level', next.join(','));
  }

  const filteredEmployees = useMemo(() => {
    if (!appState) return [];
    return appState.employees.filter((e) => {
      if (activeCountries.length > 0 && !activeCountries.includes(e.country)) return false;
      if (offering && e.projectType !== offering) return false;
      if (activeLevels.length > 0 && !activeLevels.includes(e.level)) return false;
      return true;
    });
  }, [appState, activeCountries, offering, activeLevels]);

  const metricas = useMemo(() => {
    if (!appState) return null;
    const agg = (emps: typeof filteredEmployees, i: number) => {
      let chg = 0;
      let sah = 0;
      for (const e of emps) {
        chg += e.chg[i] ?? 0;
        sah += e.sah[i] ?? 0;
      }
      return { chg, sah, pct: sah > 0 ? (chg / sah) * 100 : 0 };
    };
    const actual = agg(filteredEmployees, iSelected);
    const previo = iSelected > 0 ? agg(filteredEmployees, iSelected - 1) : null;
    return {
      ...actual,
      delta: previo ? actual.pct - previo.pct : null,
      faltan: Math.max((target / 100) * actual.sah - actual.chg, 0),
    };
  }, [filteredEmployees, iSelected, target, appState]);

  const countryMetrics = useMemo(() => {
    if (!appState) return [];
    const countries: Country[] = ['AR', 'MX', 'CR'];
    return countries
      .map((c) => {
        const emps = filteredEmployees.filter((e) => e.country === c);
        if (emps.length === 0) return null;
        let chg = 0, sah = 0;
        for (const e of emps) { chg += e.chg[iSelected] ?? 0; sah += e.sah[iSelected] ?? 0; }
        const pct = sah > 0 ? (chg / sah) * 100 : null;
        const targetPct = getTargetForCountry(c, appState.targets);
        return { country: c, pct, targetPct, overTarget: pct != null && pct >= targetPct };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [appState, filteredEmployees, iSelected]);

  const ptosData = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return filteredEmployees
      .filter((e) => e.isOnPTO || e.nextPTO !== null)
      .map((e) => ({ ...e, _ptoStart: parseDDMMYY(e.nextPTO) }))
      .filter((e) => e.isOnPTO || (e._ptoStart !== null && e._ptoStart >= hoy))
      .sort((a, b) => (a._ptoStart?.getTime() ?? 0) - (b._ptoStart?.getTime() ?? 0));
  }, [filteredEmployees]);

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
            {countryMetrics.length > 0 && (
              <div className="flex items-center gap-4">
                {countryMetrics.map(({ country, pct, targetPct, overTarget }) => (
                  <div key={country} className="flex flex-col items-end">
                    <span className="text-[10px] font-semibold text-[var(--G4)]">{country}</span>
                    <span className={`text-sm font-bold ${overTarget ? 'text-[var(--GR)]' : 'text-[var(--RD)]'}`}>
                      {pct != null ? `${overTarget ? '▲' : '▼'} ${pct.toFixed(1)}%` : '—'}
                    </span>
                    <span className="text-[9px] text-[var(--G4)]">target {targetPct}%</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div variants={section}>
            <FilterBar
              toggleGroups={[
                {
                  label: 'País',
                  options: [
                    { value: 'AR', label: 'AR' },
                    { value: 'MX', label: 'MX' },
                    { value: 'CR', label: 'CR' },
                  ],
                  active: activeCountries,
                  onToggle: toggleCountry,
                  multi: true,
                },
              ]}
              selectGroups={[
                {
                  label: 'Offering',
                  options: OFFERING_OPTIONS,
                  value: offering,
                  onChange: (v) => setParam('offering', v),
                },
                {
                  label: 'Level',
                  options: LEVEL_OPTIONS,
                  value: filterLevel,
                  onChange: (v) => setParam('level', v),
                  multi: true,
                  values: activeLevels,
                  onToggle: toggleLevel,
                },
              ]}
              trailing={
                activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const p = new URLSearchParams(searchParams.toString());
                      p.delete('country');
                      p.delete('offering');
                      p.delete('level');
                      router.replace(`?${p.toString()}`, { scroll: false });
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-[var(--P)] bg-[var(--PBG)] text-[var(--PD)] hover:bg-white cursor-pointer transition-colors"
                  >
                    <X size={11} />
                    Limpiar ({activeFilterCount})
                  </button>
                ) : undefined
              }
            />
          </motion.div>

          <motion.div variants={section}>
            <Card>
              <CardBody>
                <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--P)]">
                      Cargabilidad del período
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setISelected((i) => Math.max(0, i - 1))}
                        disabled={iSelected === 0}
                        aria-label="Período anterior"
                        className="flex items-center justify-center rounded-md border border-[var(--G5)] bg-[var(--G6)] p-1 text-[var(--G2)] hover:border-[var(--G4)] hover:bg-[var(--G5)] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <span className="min-w-[5.5rem] text-center text-[12px] font-semibold text-[var(--G2)]">
                        {appState.periods[iSelected]?.label ?? ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setISelected((i) => Math.min(appState.periods.length - 1, i + 1))}
                        disabled={iSelected === appState.periods.length - 1}
                        aria-label="Período siguiente"
                        className="flex items-center justify-center rounded-md border border-[var(--G5)] bg-[var(--G6)] p-1 text-[var(--G2)] hover:border-[var(--G4)] hover:bg-[var(--G5)] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={13} />
                      </button>
                      {iSelected !== iActual && (
                        <button
                          type="button"
                          onClick={() => setISelected(iActual)}
                          className="ml-1 text-[10px] text-[var(--P)] hover:underline"
                        >
                          ↩ actual
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline gap-3">
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
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-xs text-[var(--G3)]">
                        {iSelected === iActual
                          ? (metricas.delta !== null ? 'Variación vs período anterior' : 'Período vigente')
                          : (metricas.delta !== null ? 'Variación vs período anterior' : 'Sin período previo')}
                      </p>
                      {iSelected !== iActual && (
                        <button
                          type="button"
                          onClick={() => setISelected(iActual)}
                          className="text-[10px] text-[var(--P)] hover:underline"
                        >
                          ↩ volver al vigente
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <Mini label="Equipo" valor={String(filteredEmployees.length)} />
                    <Mini
                      label="En objetivo"
                      valor={String(contar(filteredEmployees, 'green'))}
                      color="var(--GR)"
                    />
                    <Mini
                      label="En riesgo"
                      valor={String(contar(filteredEmployees, 'yellow'))}
                      color="var(--YL)"
                    />
                    <Mini
                      label="Bajo objetivo"
                      valor={String(contar(filteredEmployees, 'red'))}
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
                  employees={filteredEmployees}
                  periods={appState.periods}
                  indicePeriodoActual={iActual}
                  targetPct={target}
                  targets={appState.targets}
                  indiceSeleccionado={iSelected}
                  onSelectPeriodo={setISelected}
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
                  employees={filteredEmployees}
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
                <OfferingDistributionChart employees={filteredEmployees} />
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
                  employees={filteredEmployees}
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