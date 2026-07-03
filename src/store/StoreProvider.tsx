'use client';

import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';

import type { AppState } from '@/src/core/domain/app-state';
import type { User } from '@/src/core/domain/user';

import { createAuthStore, type AuthStore, type AuthState } from './authStore';
import { createForecastStore, type ForecastStore, type ForecastState } from './forecastStore';
import { createUIStore, type UIStore, type UIState } from './uiStore';

interface StoreContext {
  authStore: AuthStore;
  forecastStore: ForecastStore;
  uiStore: UIStore;
}

const StoreCtx = createContext<StoreContext | null>(null);

interface StoreProviderProps {
  children: ReactNode;
  initialState?: AppState;
  user?: User | null;
}

export function StoreProvider({ children, initialState, user }: StoreProviderProps) {
  const authStoreRef = useRef<AuthStore>(null);
  const forecastStoreRef = useRef<ForecastStore>(null);
  const uiStoreRef = useRef<UIStore>(null);

  if (!authStoreRef.current) {
    authStoreRef.current = createAuthStore(user ?? null);
  }
  if (!forecastStoreRef.current) {
    forecastStoreRef.current = createForecastStore(initialState ?? null);
  }
  if (!uiStoreRef.current) {
    uiStoreRef.current = createUIStore();
  }

  return (
    <StoreCtx.Provider
      value={{
        authStore: authStoreRef.current,
        forecastStore: forecastStoreRef.current,
        uiStore: uiStoreRef.current,
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
}

function useStoreCtx(): StoreContext {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStoreCtx must be used within StoreProvider');
  return ctx;
}

export function useAuthStore<T>(selector: (s: AuthState) => T): T {
  return useStore(useStoreCtx().authStore, selector);
}

export function useForecastStore<T>(selector: (s: ForecastState) => T): T {
  return useStore(useStoreCtx().forecastStore, selector);
}

export function useUIStore<T>(selector: (s: UIState) => T): T {
  return useStore(useStoreCtx().uiStore, selector);
}
