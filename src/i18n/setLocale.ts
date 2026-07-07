'use server'

import { cookies } from 'next/headers'

import { LOCALE_COOKIE } from '@/src/lib/constants'

export async function setLocale(locale: 'es' | 'en') {
  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
}
