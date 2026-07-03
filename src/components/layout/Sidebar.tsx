'use client';

import { useWindowOffset } from '@/src/hooks/useWindowOffset';
import { useForecastStore } from '@/src/store/StoreProvider';

import { SidebarNavItem } from './SidebarNavItem';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '◻' },
  { href: '/ar', label: 'Argentina', icon: '🇦🇷' },
  { href: '/mx', label: 'México', icon: '🇲🇽' },
  { href: '/cr', label: 'Costa Rica', icon: '🇨🇷' },
  { href: '/tickets', label: 'Tickets', icon: '🎫' },
  { href: '/ppa', label: 'PPA', icon: '📊' },
  { href: '/agent', label: 'Agente IA', icon: '🤖' },
  { href: '/admin', label: 'Admin', icon: '⚙' },
];

export function Sidebar() {
  const { offset, decrement, increment, reset } = useWindowOffset();
  const period = useForecastStore((s) => s.appState?.period ?? null);
  const isLoading = useForecastStore((s) => s.isLoading);

  return (
    <aside
      className="fixed left-0 flex flex-col border-r border-[var(--G5)] bg-white"
      style={{ top: 'var(--topbar-h)', width: 'var(--sidebar-w)', bottom: 0 }}
    >
      {/* Period widget */}
      <div className="border-b border-[var(--G5)] px-3 py-3">
        <p className="text-[10px] font-semibold text-[var(--G3)] uppercase tracking-wide mb-1.5">Período</p>
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
            {period ? period.label : offset === 0 ? 'Actual' : `${offset > 0 ? '+' : ''}${offset}`}
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
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  );
}
