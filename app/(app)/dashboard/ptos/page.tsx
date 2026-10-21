import { Suspense } from 'react';
import { PtosView } from '@/src/views/ptos/PtosView';

export default function Page() {
  return (
    <Suspense>
      <PtosView />
    </Suspense>
  );
}
