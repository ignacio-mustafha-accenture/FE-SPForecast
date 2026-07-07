'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { getClientContainer } from '@/src/application/container';
import { useAuthStore } from '@/src/store/StoreProvider';
import { useToast } from '@/src/hooks/useToast';

import { LanguageSelector } from './LanguageSelector';

export function TopBar() {
  const t = useTranslations('layout');
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const toast = useToast();

  async function handleLogout() {
    try {
      await getClientContainer().logout.execute();
      router.push('/login');
    } catch {
      toast.error(t('logoutError'));
    }
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5"
      style={{ height: 'var(--topbar-h)', backgroundColor: 'var(--PD)' }}
    >
      <span className="text-white font-semibold text-sm tracking-wide">{t('appName')}</span>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <div className="text-right">
              <p className="text-white text-xs font-medium leading-none">{user.name}</p>
              <p className="text-[var(--PL)] text-[10px] mt-0.5 capitalize">{user.role}</p>
            </div>
            <LanguageSelector />
            <button
              onClick={handleLogout}
              className="text-[var(--PL)] hover:text-white text-xs transition-colors"
            >
              {t('logout')}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
