'use client'

import { createContext, useContext, type ReactNode } from 'react'

const LocaleContext = createContext<'es' | 'en'>('es')

export function LocaleProvider({ locale, children }: { locale: 'es' | 'en'; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useAppLocale() {
  return useContext(LocaleContext)
}
