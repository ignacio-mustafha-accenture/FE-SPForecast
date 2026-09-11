import { Suspense } from 'react';

import { PPADetailView } from '@/src/views/ppa/PPADetailView';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense>
      <PPADetailView id={id} />
    </Suspense>
  );
}
