'use client';

import { forwardRef } from 'react';

import { cn } from '@/src/lib/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--G1)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={3}
          className={cn(
            'w-full rounded border border-[var(--G5)] bg-white px-3 py-2 text-sm text-[var(--G1)]',
            'placeholder:text-[var(--G4)] resize-y',
            'transition-colors duration-120',
            'focus:outline-none focus:border-[var(--P)] focus:ring-1 focus:ring-[var(--P)]',
            'disabled:bg-[var(--G6)] disabled:cursor-not-allowed',
            error && 'border-[var(--RD)]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--RD)]">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
