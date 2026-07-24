import { Suspense } from 'react';

import { CountryView } from '@/src/views/country/CountryView';

export default function Page() {
  return (
    <Suspense>
      <CountryView country="MX" />
    </Suspense>
  );
}
