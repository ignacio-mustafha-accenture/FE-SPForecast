import { cn } from '@/src/lib/cn';

interface CardProps { children: React.ReactNode; className?: string }

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('neu-raised', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn('border-b border-[var(--G5)] px-5 py-3', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: CardProps) {
  return (
    <div className={cn('px-5 py-4', className)}>
      {children}
    </div>
  );
}
