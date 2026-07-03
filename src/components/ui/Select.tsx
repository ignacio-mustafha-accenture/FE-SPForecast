'use client';

import { forwardRef } from 'react';

import { cn } from '@/src/lib/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--G1)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'h-9 w-full rounded border border-[var(--G5)] bg-white px-3 text-sm text-[var(--G1)]',
            'transition-colors duration-120',
            'focus:outline-none focus:border-[var(--P)] focus:ring-1 focus:ring-[var(--P)]',
            'disabled:bg-[var(--G6)] disabled:cursor-not-allowed',
            error && 'border-[var(--RD)]',
            className,
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-[var(--RD)]">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
