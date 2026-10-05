import { Suspense } from 'react';
import { DashboardView } from '@/src/views/dashboard/DashboardView';

export default function Page() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}
