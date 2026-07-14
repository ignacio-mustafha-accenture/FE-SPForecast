'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

import { useForecastStore } from '@/src/store/StoreProvider';
import { KpiCard } from '@/src/components/ui/KpiCard';
import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { formatPercent } from '@/src/lib/formatters';
import { getTargetForCountry } from '@/src/lib/status';
import type { Employee } from '@/src/core/domain/employee';

// ── Variants ──────────────────────────────────────────────────────────────────

const page = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

// Sections that fade up (avg card, offering, alerts)
const section = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: 'easeOut' as const } },
};

// Grid rows: only stagger their children, no own animation
const row = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

// Individual cards within a row: slide in from the left
const cardItem = {
  hidden: { opacity: 0, x: -24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.34, ease: 'easeOut' as const } },
};

// Skeleton: simple fade in
const skeletonAnim = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
  exit:  { opacity: 0, transition: { duration: 0.2 } },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const OFFERING_COLORS: Record<string, string> = {
  'Tech-led':       '#534AB7',
  'CTO':            '#0F6E56',
  'OM+SPY+Others':  '#854F0B',
  'Internal':       '#185fa5',
  'Cost Take Out':  '#a32d2d',
};
const OFFERING_FALLBACK = '#b0aea8';

function getOfferingColor(name: string): string {
  return OFFERING_COLORS[name] ?? OFFERING_FALLBACK;
}

function AlertRiskBadge({ employee, targets }: { employee: Employee; targets: Record<string, number> }) {
  const target = getTargetForCountry(employee.country, targets);
  if (employee.chargeabilityStatus === 'unassigned') {
    return <Badge variant="neutral">Sin proyecto</Badge>;
  }
  const cp = employee.chargeabilityPercent * 100;
  const gap = target - cp;
  return <Badge variant="red">{`−${gap.toFixed(0)}pp vs target`}</Badge>;
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function DashboardView() {
  const t = useTranslations('dashboard');
  const appState = useForecastStore((s) => s.appState);
  const isLoading = useForecastStore((s) => s.isLoading);

  const { alerts, offeringData } = useMemo(() => {
    if (!appState) return { alerts: [], offeringData: [] };
    const { employees, targets } = appState;

    const alertList = employees.filter(
      (e) => e.chargeabilityStatus === 'unassigned' || e.chargeabilityStatus === 'red',
    );

    const offeringMap = new Map<string, { total: number; sum: number }>();
    for (const e of employees) {
      const key = e.projectType ?? 'Sin proyecto';
      const prev = offeringMap.get(key) ?? { total: 0, sum: 0 };
      offeringMap.set(key, { total: prev.total + 1, sum: prev.sum + e.chargeabilityPercent });
    }
    const offering = Array.from(offeringMap.entries())
      .map(([name, { total, sum }]) => ({ name, count: total, avgCp: total > 0 ? sum / total : 0 }))
      .sort((a, b) => b.count - a.count);

    return { alerts: alertList, offeringData: offering };
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

          {/* KPI cards — stagger left to right */}
          <motion.div
            variants={row}
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            {[
              { label: t('kpiTotal'),          value: appState.employees.length,                                                       color: undefined },
              { label: t('kpiChargeable'),     value: appState.employees.filter((e) => e.chargeabilityStatus === 'green').length,     color: 'var(--GR)' },
              { label: t('kpiAtRisk'),         value: appState.employees.filter((e) => e.chargeabilityStatus === 'yellow').length,    color: 'var(--YL)' },
              { label: t('kpiNotChargeable'),  value: appState.employees.filter((e) => e.chargeabilityStatus === 'red').length,       color: 'var(--RD)' },
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

          {/* Country summary cards — stagger left to right */}
          <motion.div
            variants={row}
            className="grid grid-cols-1 gap-4 lg:grid-cols-3"
          >
            {appState.countrySummaries.map((cs) => (
              <motion.div key={cs.country} variants={cardItem}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[var(--G1)]">{cs.country}</h3>
                      <Badge variant="neutral">{cs.totalEmployees} {t('countryEmployees')}</Badge>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--G3)]">{t('kpiChargeable')}</span>
                        <Badge variant="green">{cs.chargeableCount}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--G3)]">{t('kpiAtRisk')}</span>
                        <Badge variant="yellow">{cs.atRiskCount}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--G3)]">{t('kpiNotChargeable')}</span>
                        <Badge variant="red">{cs.unchargeableCount}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--G3)]">Sin proyecto</span>
                        <Badge variant="neutral">{cs.unassignedCount}</Badge>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-[var(--G5)]">
                        <span className="text-[var(--G3)]">{t('avgChargeability')}</span>
                        <span className="font-medium text-[var(--G1)]">{formatPercent(cs.avgChargeability)}</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Cargabilidad por Offering */}
          <motion.div variants={section}>
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-[var(--G1)]">{t('sectionOffering')}</h2>
              </CardHeader>
              <CardBody>
                {offeringData.length === 0 ? (
                  <p className="text-sm text-[var(--G3)]">{t('noAlerts')}</p>
                ) : (
                  <div className="space-y-3">
                    {offeringData.map((o) => (
                      <div key={o.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[var(--G1)] font-medium">{o.name}</span>
                          <span className="text-[var(--G3)] text-xs">{o.count} pers · {formatPercent(o.avgCp)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--G6)] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: getOfferingColor(o.name) }}
                            initial={{ width: 0 }}
                            animate={{ width: `${(o.count / (offeringData[0]?.count ?? 1)) * 100}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' as const, delay: 0.3 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </motion.div>

          {/* Alertas de riesgo */}
          <motion.div variants={section}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--G1)]">{t('sectionAlerts')}</h2>
                  {alerts.length > 0 && <Badge variant="red">{alerts.length}</Badge>}
                </div>
              </CardHeader>
              <CardBody>
                {alerts.length === 0 ? (
                  <p className="text-sm text-[var(--G3)]">{t('noAlerts')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--G5)]">
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--G3)] uppercase">{t('colEmployee')}</th>
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--G3)] uppercase">{t('colCountry')}</th>
                          <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--G3)] uppercase">{t('colRisk')}</th>
                          <th className="text-left py-2 text-xs font-semibold text-[var(--G3)] uppercase">{t('colDetail')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.slice(0, 20).map((e) => (
                          <tr key={e.id} className="border-b border-[var(--G6)] hover:bg-[var(--G6)]">
                            <td className="py-2 pr-4 font-medium text-[var(--G1)]">{e.name}</td>
                            <td className="py-2 pr-4 text-[var(--G3)]">{e.country}</td>
                            <td className="py-2 pr-4">
                              <AlertRiskBadge employee={e} targets={appState.targets} />
                            </td>
                            <td className="py-2 text-xs text-[var(--G3)]">
                              {e.fad ? `FAD: ${e.fad}` : e.rollOff ? `Roll off: ${e.rollOff}` : '—'}
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}
