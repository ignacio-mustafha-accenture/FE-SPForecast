'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/src/lib/cn';

interface SidebarNavItemProps {
  href: string;
  label: string;
  icon?: LucideIcon;
  matchPaths?: string[];
}

export function SidebarNavItem({ href, label, icon: Icon, matchPaths }: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href ||
    (href !== '/' && pathname.startsWith(href)) ||
    (matchPaths?.some((p) => pathname === p || pathname.startsWith(p)) ?? false);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-[box-shadow,background-color,color] duration-200 ease-out',
        isActive
          ? 'neu-pressed text-[var(--PD)] font-semibold'
          : 'text-[var(--G2)] hover:bg-white/50 hover:text-[var(--G1)]',
      )}
    >
      {Icon && <Icon size={16} />}
      {label}
    </Link>
  );
}
