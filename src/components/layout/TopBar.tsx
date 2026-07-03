'use client';

import { useRouter } from 'next/navigation';

import { getClientContainer } from '@/src/application/container';
import { useAuthStore } from '@/src/store/StoreProvider';
import { useToast } from '@/src/hooks/useToast';

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const toast = useToast();

  async function handleLogout() {
    try {
      await getClientContainer().logout.execute();
      router.push('/login');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5"
      style={{ height: 'var(--topbar-h)', backgroundColor: 'var(--PD)' }}
    >
      <span className="text-white font-semibold text-sm tracking-wide">SP Forecast</span>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <div className="text-right">
              <p className="text-white text-xs font-medium leading-none">{user.name}</p>
              <p className="text-[var(--PL)] text-[10px] mt-0.5 capitalize">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-[var(--PL)] hover:text-white text-xs transition-colors"
            >
              Salir
            </button>
          </>
        )}
      </div>
    </header>
  );
}
