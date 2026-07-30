'use client';

import { useTranslations } from 'next-intl';
import { LayoutDashboard, Globe, Ticket, ArrowLeftRight, Bot, Settings, Users } from 'lucide-react';

import { SidebarNavItem } from './SidebarNavItem';

export function Sidebar() {
  const t = useTranslations('layout');
  const NAV_ITEMS = [
    { href: '/', label: t('navDashboard'), icon: LayoutDashboard },
    // { href: '/countries', label: t('navCountries'), icon: Globe, matchPaths: ['/ar', '/mx', '/cr'] },
    { href: '/all', label: t('navAll'), icon: Users },
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
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  );
}
