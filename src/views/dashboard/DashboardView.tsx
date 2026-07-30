'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

import { useForecastStore } from '@/src/store/StoreProvider';
import { KpiCard } from '@/src/components/ui/KpiCard';
import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { formatPercent, parseDDMMYY } from '@/src/lib/formatters';

// ── Variants ──────────────────────────────────────────────────────────────────

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
  exit:  { opacity: 0, transition: { duration: 0.2 } },
};

// ── Main view ─────────────────────────────────────────────────────────────────

export function DashboardView() {
  const t = useTranslations('dashboard');
  const appState = useForecastStore((s) => s.appState);
  const isLoading = useForecastStore((s) => s.isLoading);

  const ptosData = useMemo(() => {
    if (!appState) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appState.employees
      .filter((e) => e.nextPTO !== null)
      .map((e) => ({ ...e, _ptoStart: parseDDMMYY(e.nextPTO) }))
      .filter((e) => e._ptoStart !== null && e._ptoStart >= today)
      .sort((a, b) => a._ptoStart!.getTime() - b._ptoStart!.getTime());
  }, [appState]);

  const showSkeleton = isLoading && !appState;

  return (
    <AnimatePresence mode="wait">
      {showSkeleton ? (
        <motion.div
          key="skeleton"
          variants={skeletonAnim}
          initial="hidden"
          animate="show"
          exit="exit"
        >
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
        <motion.div
          key="content"
          variants={page}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Title */}
          <motion.div variants={section}>
            <h1 className="text-xl font-bold text-[var(--BK)]">{t('title')}</h1>
            {appState.period && (
              <p className="text-sm text-[var(--G3)] mt-0.5">{appState.period.label}</p>
            )}
          </motion.div>

          {/* KPI cards */}
          <motion.div variants={row} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: t('kpiTotal'),         value: appState.employees.length,                                                      color: undefined },
              { label: t('kpiChargeable'),    value: appState.employees.filter((e) => e.chargeabilityStatus === 'green').length,    color: 'var(--GR)' },
              { label: t('kpiAtRisk'),        value: appState.employees.filter((e) => e.chargeabilityStatus === 'yellow').length,   color: 'var(--YL)' },
              { label: t('kpiNotChargeable'), value: appState.employees.filter((e) => e.chargeabilityStatus === 'red').length,      color: 'var(--RD)' },
            ].map(({ label, value, color }) => (
              <motion.div key={label} variants={cardItem}>
                <KpiCard label={label} value={value} accentColor={color} />
              </motion.div>
            ))}
          </motion.div>

          {/* Avg chargeability */}
          <motion.div variants={section}>
            <KpiCard
              label={t('kpiAvgChargeability')}
              value={formatPercent(
                appState.employees.length > 0
                  ? appState.employees.reduce((acc, e) => acc + e.chargeabilityPercent, 0) / appState.employees.length
                  : 0,
              )}
              accentColor="var(--P)"
              className="max-w-xs"
            />
          </motion.div>

          {/* Próximas vacaciones */}
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
                            <td className="py-2 pr-4 text-[var(--G3)]">{e.nextPTO} – {e.nextPTOEnd ?? '—'}</td>
                            <td className="py-2 pr-4 text-[var(--G3)]">{e.nextPTOHours ?? '—'}h</td>
                            <td className="py-2">
                              {e.isOnPTO
                                ? <Badge variant="yellow">En curso</Badge>
                                : <Badge variant="neutral">Próximo</Badge>
                              }
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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-24 w-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}
