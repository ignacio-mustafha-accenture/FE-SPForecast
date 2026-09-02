'use client';

import { useEffect, useState } from 'react';

import { getClientContainer } from '@/src/application/container';
import type { CalendarPeriod } from '@/src/core/domain/period';

interface UsePeriodsResult {
  periods: CalendarPeriod[];
  loading: boolean;
  error: boolean;
}

export function usePeriods(enabled = true): UsePeriodsResult {
  const [periods, setPeriods] = useState<CalendarPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    getClientContainer()
      .listPeriods.execute()
      .then((items) => {
        if (!cancelled) setPeriods(items);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { periods, loading, error };
}
