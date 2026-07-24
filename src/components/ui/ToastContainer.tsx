'use client';

import { AnimatePresence } from 'framer-motion';

import { useUIStore } from '@/src/store/StoreProvider';

import { Toast } from './Toast';

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
