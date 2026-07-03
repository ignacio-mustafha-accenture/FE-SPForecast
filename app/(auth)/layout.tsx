import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--G6)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--PD)]">SP Forecast</h1>
          <p className="text-sm text-[var(--G3)] mt-1">Accenture — Staffing &amp; Chargeability</p>
        </div>
        {children}
      </div>
    </div>
  );
}
