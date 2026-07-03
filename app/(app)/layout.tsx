import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createServerContainer } from '@/src/application/container';
import { COOKIE_NAME } from '@/src/lib/constants';
import { StoreProvider } from '@/src/store/StoreProvider';
import { AppShell } from '@/src/components/layout/AppShell';
import { ApiError } from '@/src/adapters/http/fetcher';
import type { AppState } from '@/src/core/domain/app-state';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const hasCookie = cookieStore.has(COOKIE_NAME);
  if (!hasCookie) redirect('/login');

  const container = createServerContainer(cookieHeader);

  let appState: AppState | null = null;
  try {
    const [state, user] = await Promise.all([
      container.fetchState.execute(0),
      container.getAuthUser.execute(),
    ]);
    appState = state;

    return (
      <StoreProvider initialState={appState} user={user}>
        <AppShell>{children}</AppShell>
      </StoreProvider>
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect('/login');
    }
    return (
      <StoreProvider initialState={appState ?? undefined} user={null}>
        <AppShell>{children}</AppShell>
      </StoreProvider>
    );
  }
}
