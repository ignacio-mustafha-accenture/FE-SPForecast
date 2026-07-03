import { cn } from '@/src/lib/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = 'rect', width, height }: SkeletonProps) {
  return (
    <span
      className={cn(
        'block animate-pulse bg-[var(--G5)] rounded',
        variant === 'circle' && 'rounded-full',
        variant === 'text' && 'h-4 rounded',
        className,
      )}
      style={{ width, height }}
    />
  );
}
