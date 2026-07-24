import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createServerContainer } from '@/src/application/container';
import { COOKIE_NAME } from '@/src/lib/constants';
import { StoreProvider } from '@/src/store/StoreProvider';
import { AppShell } from '@/src/components/layout/AppShell';
import { ApiError } from '@/src/adapters/http/fetcher';
import type { AppState } from '@/src/core/domain/app-state';
import type { User } from '@/src/core/domain/user';

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
  let user: User | null = null;
  try {
    const result = await Promise.all([
      container.fetchState.execute(0),
      container.getAuthUser.execute(),
    ]);
    appState = result[0];
    user = result[1];
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect('/login');
    }
  }

  return (
    <StoreProvider initialState={appState ?? undefined} user={user}>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
