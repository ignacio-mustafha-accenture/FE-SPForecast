'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/src/lib/cn';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allLabel?: string;
  className?: string;
  /** Tamaño compacto para uso en barras de filtros */
  compact?: boolean;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder,
  allLabel = 'Todos',
  className,
  compact = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  const allOptions = [{ value: '', label: allLabel }, ...options];
  const selected = allOptions.find((o) => o.value === value);

  function toggleOpen() {
    setOpen((v) => { if (!v) setActiveIdx(-1); return !v; });
  }

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    (listRef.current.children[activeIdx] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, allOptions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      onChange(allOptions[activeIdx].value);
      setOpen(false);
    } else if (e.key === 'Escape') { setOpen(false); }
  }

  const triggerClass = compact
    ? cn(
        'flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border rounded-full bg-white transition-colors focus:outline-none cursor-pointer',
        open || value
          ? 'border-[var(--P)] text-[var(--PD)] bg-[var(--PBG)]'
          : 'border-[var(--G5)] text-[var(--G2)] hover:border-[var(--G3)]',
        className,
      )
    : cn(
        'flex items-center gap-2 w-full px-3 py-2 border rounded-lg bg-white text-sm text-left focus:outline-none transition-colors cursor-pointer',
        open ? 'border-[var(--P)] ring-1 ring-[var(--P)]' : 'border-[var(--G5)]',
        className,
      );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        onBlur={() => setTimeout(() => { setOpen(false); setActiveIdx(-1); }, 150)}
        onKeyDown={onKeyDown}
        className={triggerClass}
      >
        <span className={compact ? undefined : `flex-1 ${value ? 'text-[var(--G1)]' : 'text-[var(--G4)]'}`}>
          {selected?.label ?? placeholder ?? allLabel}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
        >
          <ChevronDown size={compact ? 11 : 14} className="text-[var(--G3)]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 left-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden min-w-[120px] max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--G5)] [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            {allOptions.map((o, i) => (
              <li
                key={o.value}
                onMouseDown={() => { onChange(o.value); setOpen(false); }}
                className={cn(
                  'px-3 py-2 text-sm cursor-pointer transition-colors',
                  i === activeIdx
                    ? 'bg-[var(--G6)]'
                    : value === o.value
                      ? 'bg-[var(--PBG)] text-[var(--PD)] font-medium'
                      : 'text-[var(--G1)] hover:bg-[var(--G6)]',
                )}
              >
                {o.label}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
