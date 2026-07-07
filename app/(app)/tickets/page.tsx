import { Suspense } from 'react';
import { TicketsView } from '@/src/views/tickets/TicketsView';

export default function Page() {
  return (
    <Suspense>
      <TicketsView />
    </Suspense>
  );
}
