'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import type { Country } from '@/src/core/domain/employee';
import { useForecastStore } from '@/src/store/StoreProvider';
import { Card, CardBody } from '@/src/components/ui/Card';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { formatPercent } from '@/src/lib/formatters';

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

const COUNTRIES: { code: Country; label: string; flag: string; href: string }[] = [
  { code: 'AR', label: 'Argentina', flag: '🇦🇷', href: '/ar' },
  { code: 'MX', label: 'México', flag: '🇲🇽', href: '/mx' },
  { code: 'CR', label: 'Costa Rica', flag: '🇨🇷', href: '/cr' },
];

export function CountriesView() {
  const t = useTranslations('countries');
  const router = useRouter();
  const appState = useForecastStore((s) => s.appState);
  const isLoading = useForecastStore((s) => s.isLoading);

  const stats = useMemo(() => {
    const employees = appState?.employees ?? [];
    return COUNTRIES.map(({ code, label, flag, href }) => {
      const countryEmployees = employees.filter((e) => e.country === code);
      const total = countryEmployees.length;
      const green = countryEmployees.filter((e) => e.chargeabilityStatus === 'green').length;
      const yellow = countryEmployees.filter((e) => e.chargeabilityStatus === 'yellow').length;
      const red = countryEmployees.filter((e) => e.chargeabilityStatus === 'red').length;
      const other = total - green - yellow - red;
      const avgChargeability =
        total > 0
          ? countryEmployees.reduce((sum, e) => sum + e.chargeabilityPercent, 0) / total
          : 0;
      return { code, label, flag, href, total, green, yellow, red, other, avgChargeability };
    });
  }, [appState]);

  return (
    <AnimatePresence mode="wait">
      {isLoading && !appState ? (
        <motion.div
          key="skeleton"
          variants={skeletonAnim}
          initial="hidden"
          animate="show"
          exit="exit"
          className="space-y-4"
        >
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          variants={page}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <motion.div variants={section}>
            <h1 className="text-xl font-bold text-[var(--BK)]">{t('title')}</h1>
            <p className="text-sm text-[var(--G3)] mt-0.5">{t('subtitle')}</p>
          </motion.div>

          <motion.div variants={row} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((country) => (
              <motion.div key={country.code} variants={cardItem}>
                <button
                  onClick={() => router.push(country.href)}
                  className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--P)] rounded-xl"
                >
                  <Card className="h-full transition-shadow duration-150 hover:shadow-md cursor-pointer group">
                    <CardBody className="flex flex-col gap-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl leading-none select-none">{country.flag}</span>
                          <div>
                            <h2 className="text-base font-bold text-[var(--BK)]">{country.label}</h2>
                            <p className="text-xs text-[var(--G3)]">
                              {country.total} {t('employees')}
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          size={18}
                          className="text-[var(--G4)] group-hover:text-[var(--P)] transition-colors duration-150"
                        />
                      </div>

                      {/* Avg chargeability */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[var(--G3)]">{t('avgChargeability')}</span>
                          <span className="text-xs font-semibold text-[var(--G1)]">
                            {formatPercent(country.avgChargeability)}
                          </span>
                        </div>
                        <ProgressBar
                          value={country.avgChargeability}
                          max={1}
                          color={
                            country.avgChargeability >= 0.8
                              ? 'var(--GR)'
                              : country.avgChargeability >= 0.5
                                ? 'var(--YL)'
                                : 'var(--RD)'
                          }
                        />
                      </div>

                      {/* Status breakdown */}
                      {country.total > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {country.green > 0 && (
                            <StatusPill color="green" count={country.green} label={t('statusChargeable')} />
                          )}
                          {country.yellow > 0 && (
                            <StatusPill color="yellow" count={country.yellow} label={t('statusAtRisk')} />
                          )}
                          {country.red > 0 && (
                            <StatusPill color="red" count={country.red} label={t('statusNotChargeable')} />
                          )}
                          {country.other > 0 && (
                            <StatusPill color="neutral" count={country.other} label={t('statusOther')} />
                          )}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </button>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatusPill({
  color,
  count,
  label,
}: {
  color: 'green' | 'yellow' | 'red' | 'neutral';
  count: number;
  label: string;
}) {
  const styles = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${styles[color]}`}>
      <span className="font-bold">{count}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}
