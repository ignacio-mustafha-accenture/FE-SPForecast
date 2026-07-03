'use client';

import { forwardRef } from 'react';

import { cn } from '@/src/lib/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--G1)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-9 w-full rounded border border-[var(--G5)] bg-white px-3 text-sm text-[var(--G1)]',
            'placeholder:text-[var(--G4)]',
            'transition-colors duration-120',
            'focus:outline-none focus:border-[var(--P)] focus:ring-1 focus:ring-[var(--P)]',
            'disabled:bg-[var(--G6)] disabled:cursor-not-allowed',
            error && 'border-[var(--RD)] focus:border-[var(--RD)] focus:ring-[var(--RD)]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--RD)]">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
