'use client';

import { cn } from '@/src/lib/cn';

type Variant = 'primary' | 'ghost' | 'approve' | 'approve-outline' | 'reject' | 'reject-outline' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: 'brand-gradient brand-glow hover:brightness-110 active:brightness-95 focus-visible:ring-[var(--P)]',
  ghost: 'neu-interactive text-[var(--G1)] focus-visible:ring-[var(--G4)]',
  approve: 'bg-[var(--GR)] text-white hover:opacity-90 focus-visible:ring-[var(--GR)]',
  'approve-outline': 'neu-interactive text-[var(--GR)] focus-visible:ring-[var(--GR)]',
  reject: 'bg-[var(--RD)] text-white hover:opacity-90 focus-visible:ring-[var(--RD)]',
  'reject-outline': 'neu-interactive text-[var(--RD)] focus-visible:ring-[var(--RD)]',
  link: 'bg-transparent text-[var(--P)] hover:underline p-0 h-auto',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-7 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-[filter,box-shadow,transform,background-color] duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        variant !== 'link' && sizeStyles[size],
        className,
      )}
    >
      {loading && (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}
