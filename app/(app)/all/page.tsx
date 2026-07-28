import { Suspense } from 'react';
import { AllView } from '@/src/views/all/AllView';

export default function Page() {
  return (
    <Suspense>
      <AllView />
    </Suspense>
  );
}
