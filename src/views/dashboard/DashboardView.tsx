'use client';

import { useForecastStore } from '@/src/store/StoreProvider';
import { KpiCard } from '@/src/components/ui/KpiCard';
import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { formatPercent } from '@/src/lib/formatters';

export function DashboardView() {
  const appState = useForecastStore((s) => s.appState);
  const isLoading = useForecastStore((s) => s.isLoading);

  if (isLoading && !appState) {
    return <DashboardSkeleton />;
  }

  if (!appState) {
    return <p className="text-[var(--G3)] text-sm">Sin datos disponibles.</p>;
  }

  const { employees, countrySummaries, period } = appState;

  const totalEmployees = employees.length;
  const chargeableCount = employees.filter((e) => e.chargeabilityStatus === 'green').length;
  const atRiskCount = employees.filter((e) => e.chargeabilityStatus === 'yellow').length;
  const unchargeableCount = employees.filter((e) => e.chargeabilityStatus === 'red').length;
  const avgChargeability =
    totalEmployees > 0
      ? employees.reduce((acc, e) => acc + e.chargeabilityPercent, 0) / totalEmployees
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--BK)]">Dashboard</h1>
        {period && (
          <p className="text-sm text-[var(--G3)] mt-0.5">{period.label}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total empleados" value={totalEmployees} />
        <KpiCard label="Chargeables" value={chargeableCount} accentColor="var(--GR)" />
        <KpiCard label="En riesgo" value={atRiskCount} accentColor="var(--YL)" />
        <KpiCard label="No chargeables" value={unchargeableCount} accentColor="var(--RD)" />
      </div>

      <KpiCard
        label="Chargeability promedio"
        value={formatPercent(avgChargeability)}
        accentColor="var(--P)"
        className="max-w-xs"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {countrySummaries.map((cs) => (
          <Card key={cs.country}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--G1)]">{cs.country}</h3>
                <Badge variant="neutral">{cs.totalEmployees} empleados</Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--G3)]">Chargeables</span>
                  <Badge variant="green">{cs.chargeableCount}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--G3)]">En riesgo</span>
                  <Badge variant="yellow">{cs.atRiskCount}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--G3)]">No chargeables</span>
                  <Badge variant="red">{cs.unchargeableCount}</Badge>
                </div>
                <div className="flex justify-between pt-1 border-t border-[var(--G5)]">
                  <span className="text-[var(--G3)]">Avg. chargeability</span>
                  <span className="font-medium text-[var(--G1)]">
                    {formatPercent(cs.avgChargeability)}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
