import { createStore } from 'zustand';

import type { AppState } from '@/src/core/domain/app-state';
import { getClientContainer } from '@/src/application/container';

export interface ForecastState {
  appState: AppState | null;
  windowOffset: number;
  isLoading: boolean;
  error: string | null;
  setInitialState: (appState: AppState) => void;
  fetchState: (offset: number) => Promise<void>;
}

export type ForecastStore = ReturnType<typeof createForecastStore>;

export function createForecastStore(initialAppState: AppState | null = null) {
  return createStore<ForecastState>((set) => ({
    appState: initialAppState,
    windowOffset: 0,
    isLoading: false,
    error: null,
    setInitialState: (appState) => set({ appState, windowOffset: 0 }),
    fetchState: async (offset) => {
      set({ isLoading: true, error: null, windowOffset: offset });
      try {
        const container = getClientContainer();
        const appState = await container.fetchState.execute(offset);
        set({ appState, isLoading: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error fetching state';
        set({ isLoading: false, error: message });
      }
    },
  }));
}
