import { cn } from '@/src/lib/cn';

type BadgeVariant = 'purple' | 'green' | 'yellow' | 'red' | 'blue' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  purple: 'bg-[var(--PBG)] text-[var(--PD)]',
  green:  'bg-[var(--GRB)] text-[var(--GR)]',
  yellow: 'bg-[var(--YLB)] text-[var(--YL)]',
  red:    'bg-[var(--RDB)] text-[var(--RD)]',
  blue:   'bg-[var(--BLB)] text-[var(--BL)]',
  neutral:'bg-[var(--G6)]  text-[var(--G2)]',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
