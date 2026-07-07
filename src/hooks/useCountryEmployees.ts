'use client';

import { useMemo } from 'react';

import type { Country, Employee } from '@/src/core/domain/employee';
import { useForecastStore } from '@/src/store/StoreProvider';

export function useCountryEmployees(country: Country): Employee[] {
  // Selector must return a stable reference — avoid filter() inside getServerSnapshot.
  const employees = useForecastStore((s) => s.appState?.employees ?? null);
  return useMemo(
    () => (employees ?? []).filter((e) => e.country === country),
    [employees, country],
  );
}
