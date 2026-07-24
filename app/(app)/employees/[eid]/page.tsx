import { Suspense } from 'react';

import { EmployeeDetailView } from '@/src/views/employees/EmployeeDetailView';

interface Props {
  params: Promise<{ eid: string }>;
}

export default async function Page({ params }: Props) {
  const { eid } = await params;
  return (
    <Suspense>
      <EmployeeDetailView eid={eid} />
    </Suspense>
  );
}
