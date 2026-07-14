'use client';

import { useTranslations } from 'next-intl';
import { LayoutDashboard, Globe, Ticket, ArrowLeftRight, Bot, Settings } from 'lucide-react';

import { useWindowOffset } from '@/src/hooks/useWindowOffset';
import { useForecastStore } from '@/src/store/StoreProvider';

import { SidebarNavItem } from './SidebarNavItem';

export function Sidebar() {
  const t = useTranslations('layout');
  const { offset, decrement, increment, reset } = useWindowOffset();
  const period = useForecastStore((s) => s.appState?.period ?? null);
  const isLoading = useForecastStore((s) => s.isLoading);
  const NAV_ITEMS = [
    { href: '/', label: t('navDashboard'), icon: LayoutDashboard },
    { href: '/countries', label: t('navCountries'), icon: Globe, matchPaths: ['/ar', '/mx', '/cr'] },
    { href: '/tickets', label: t('navTickets'), icon: Ticket },
    { href: '/ppa', label: t('navPPA'), icon: ArrowLeftRight },
    { href: '/agent', label: t('navAgent'), icon: Bot },
    { href: '/admin', label: t('navAdmin'), icon: Settings },
  ];

  return (
    <aside
      className="fixed left-0 flex flex-col border-r border-[var(--G5)] bg-white"
      style={{ top: 'var(--topbar-h)', width: 'var(--sidebar-w)', bottom: 0 }}
    >
      {/* Period widget */}
      <div className="border-b border-[var(--G5)] px-3 py-3">
        <p className="text-[10px] font-semibold text-[var(--G3)] uppercase tracking-wide mb-1.5">{t('period')}</p>
        <div className="flex items-center justify-between gap-1">
          <button
            onClick={decrement}
            disabled={isLoading}
            className="w-7 h-7 rounded flex items-center justify-center text-[var(--G3)] hover:bg-[var(--G6)] hover:text-[var(--G1)] disabled:opacity-40 transition-colors"
          >
            ‹
          </button>
          <button
            onClick={reset}
            className="flex-1 text-center text-xs font-medium text-[var(--G1)] hover:text-[var(--P)] transition-colors truncate"
          >
            {period ? period.label : offset === 0 ? t('current') : `${offset > 0 ? '+' : ''}${offset}`}
          </button>
          <button
            onClick={increment}
            disabled={isLoading}
            className="w-7 h-7 rounded flex items-center justify-center text-[var(--G3)] hover:bg-[var(--G6)] hover:text-[var(--G1)] disabled:opacity-40 transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ matchPaths, ...item }) => (
          <SidebarNavItem key={item.href} {...item} matchPaths={matchPaths} />
        ))}
      </nav>
    </aside>
  );
}
