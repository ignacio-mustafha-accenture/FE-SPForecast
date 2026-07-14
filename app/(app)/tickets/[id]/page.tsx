import { Suspense } from 'react';
import { TicketDetailView } from '@/src/views/tickets/TicketDetailView';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense>
      <TicketDetailView id={id} />
    </Suspense>
  );
}
