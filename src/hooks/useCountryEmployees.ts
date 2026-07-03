'use client';

import type { Country, Employee } from '@/src/core/domain/employee';
import { useForecastStore } from '@/src/store/StoreProvider';

export function useCountryEmployees(country: Country): Employee[] {
  return useForecastStore(
    (s) => s.appState?.employees.filter((e) => e.country === country) ?? [],
  );
}
