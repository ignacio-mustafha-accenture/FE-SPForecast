import { Suspense } from 'react';

import { ResetPasswordPage } from '@/src/views/auth/ResetPasswordPage';

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  );
}
