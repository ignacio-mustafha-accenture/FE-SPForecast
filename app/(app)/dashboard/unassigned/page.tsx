import { Suspense } from 'react';
import { UnassignedView } from '@/src/views/unassigned/UnassignedView';

export default function Page() {
  return (
    <Suspense>
      <UnassignedView />
    </Suspense>
  );
}
