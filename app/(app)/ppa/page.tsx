import { Suspense } from 'react';
import { PPAView } from '@/src/views/ppa/PPAView';

export default function Page() {
  return (
    <Suspense>
      <PPAView />
    </Suspense>
  );
}
