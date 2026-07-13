'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { setLocale } from '@/src/i18n/setLocale';
import { useAppLocale } from '@/src/i18n/LocaleContext';

interface UserMenuProps {
  name: string;
  role: string;
  onLogout: () => void;
}

export function UserMenu({ name, role, onLogout }: UserMenuProps) {
  const t = useTranslations('layout');
  const locale = useAppLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLocale(next: 'es' | 'en') {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-right"
      >
        <div>
          <p className="text-white text-xs font-medium leading-none">{name}</p>
          <p className="text-[var(--PL)] text-[10px] mt-0.5 capitalize">{role}</p>
        </div>
        <svg
          className={`w-3 h-3 text-[var(--PL)] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 min-w-[160px] rounded-md border border-white/10 z-50 py-1"
          style={{ backgroundColor: 'var(--PD)' }}
        >
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--PL)]">
            {t('language')}
          </p>
          <button
            onClick={() => handleLocale('es')}
            disabled={pending}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <span className={`w-3 text-center ${locale === 'es' ? 'text-white' : 'invisible'}`}>✓</span>
            <span className={locale === 'es' ? 'text-white' : 'text-[var(--PL)]'}>{t('langEs')}</span>
          </button>
          <button
            onClick={() => handleLocale('en')}
            disabled={pending}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <span className={`w-3 text-center ${locale === 'en' ? 'text-white' : 'invisible'}`}>✓</span>
            <span className={locale === 'en' ? 'text-white' : 'text-[var(--PL)]'}>{t('langEn')}</span>
          </button>

          <hr className="my-1 border-white/10" />

          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--PL)] hover:text-white hover:bg-white/10 transition-colors"
          >
            <span>⎋</span>
            <span>{t('logout')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
