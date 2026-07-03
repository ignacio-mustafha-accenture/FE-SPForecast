'use client';

import type { AppState } from '@/src/core/domain/app-state';
import { useForecastStore } from '@/src/store/StoreProvider';

export function useForecastState(): AppState | null {
  return useForecastStore((s) => s.appState);
}

export function useForecastLoading(): boolean {
  return useForecastStore((s) => s.isLoading);
}
