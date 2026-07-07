'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/src/lib/cn';

interface SearchProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

interface ToggleOption {
  value: string;
  label: string;
}

interface ToggleGroup {
  label: string;
  options: ToggleOption[];
  active: string[];
  onToggle: (value: string) => void;
  multi?: boolean;
}

interface FilterBarProps {
  search?: SearchProps;
  toggleGroups?: ToggleGroup[];
  className?: string;
}

export function FilterBar({ search, toggleGroups, className }: FilterBarProps) {
  const t = useTranslations('common');

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {search && (
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--G3)] pointer-events-none"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? t('search')}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-[var(--G5)] rounded-md bg-white text-[var(--G1)] placeholder-[var(--G4)] focus:outline-none focus:border-[var(--P)] focus:ring-1 focus:ring-[var(--P)]"
          />
        </div>
      )}

      {toggleGroups?.map((group) => (
        <div key={group.label} className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--G3)] whitespace-nowrap">{group.label}:</span>
          <Chip
            label={t('all')}
            active={group.active.length === 0}
            onClick={() => {
              if (group.active.length > 0) {
                group.active.forEach((v) => group.onToggle(v));
              }
            }}
          />
          {group.options.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={group.active.includes(opt.value)}
              onClick={() => group.onToggle(opt.value)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors duration-120',
        active
          ? 'bg-[var(--PBG)] text-[var(--PD)] border-[var(--P)]'
          : 'bg-white text-[var(--G2)] border-[var(--G5)] hover:border-[var(--G3)]',
      )}
    >
      {label}
    </button>
  );
}
