import { cn } from '@/src/lib/cn';

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  accentColor?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  delta,
  deltaPositive,
  accentColor = 'var(--P)',
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'neu-raised overflow-hidden',
        className,
      )}
    >
      <div className="h-1" style={{ backgroundColor: accentColor }} />
      <div className="px-5 py-4">
        <p className="text-xs font-medium text-[var(--G3)] uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-[28px] font-bold text-[var(--BK)] leading-none">{value}</p>
        {delta !== undefined && (
          <p className={cn('mt-1 text-xs font-medium', deltaPositive ? 'text-[var(--GR)]' : 'text-[var(--RD)]')}>
            {delta}
          </p>
        )}
      </div>
    </div>
  );
}
