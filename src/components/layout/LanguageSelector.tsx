'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { setLocale } from '@/src/i18n/setLocale';
import { useAppLocale } from '@/src/i18n/LocaleContext';

export function LanguageSelector() {
  const locale = useAppLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(next: 'es' | 'en') {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => handleChange('es')}
        disabled={pending}
        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors disabled:opacity-50 ${
          locale === 'es'
            ? 'bg-white/20 text-white'
            : 'text-[var(--PL)] hover:text-white'
        }`}
      >
        ES
      </button>
      <span className="text-[var(--PL)] text-[10px]">/</span>
      <button
        onClick={() => handleChange('en')}
        disabled={pending}
        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors disabled:opacity-50 ${
          locale === 'en'
            ? 'bg-white/20 text-white'
            : 'text-[var(--PL)] hover:text-white'
        }`}
      >
        EN
      </button>
    </div>
  );
}
