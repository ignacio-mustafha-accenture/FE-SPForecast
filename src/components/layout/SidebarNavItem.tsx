'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/src/lib/cn';

interface SidebarNavItemProps {
  href: string;
  label: string;
  icon?: string;
}

export function SidebarNavItem({ href, label, icon }: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors duration-120',
        isActive
          ? 'bg-[var(--PB)] text-[var(--P)] font-semibold'
          : 'text-[var(--G2)] hover:bg-[var(--G6)] hover:text-[var(--G1)]',
      )}
    >
      {icon && <span className="text-base">{icon}</span>}
      {label}
    </Link>
  );
}
