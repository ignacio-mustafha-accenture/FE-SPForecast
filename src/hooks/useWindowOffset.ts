'use client';

import { useForecastStore } from '@/src/store/StoreProvider';

export function useWindowOffset() {
  const offset = useForecastStore((s) => s.windowOffset);
  const fetchState = useForecastStore((s) => s.fetchState);

  return {
    offset,
    increment: () => fetchState(offset + 1),
    decrement: () => fetchState(offset - 1),
    reset: () => fetchState(0),
  };
}
