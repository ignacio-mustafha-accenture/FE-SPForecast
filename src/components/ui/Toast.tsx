'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/src/lib/cn';
import type { Toast as ToastType } from '@/src/store/uiStore';
import { useUIStore } from '@/src/store/StoreProvider';

interface ToastProps {
  toast: ToastType;
}

const variantStyles = {
  success: 'bg-[var(--GRB)] border-[var(--GR)] text-[var(--GR)]',
  error:   'bg-[var(--RDB)] border-[var(--RD)] text-[var(--RD)]',
  info:    'bg-[var(--BLB)] border-[var(--BL)] text-[var(--BL)]',
};

export function Toast({ toast }: ToastProps) {
  const removeToast = useUIStore((s) => s.removeToast);

  useEffect(() => {
    const t = setTimeout(() => removeToast(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, removeToast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.12 }}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-md',
        variantStyles[toast.type],
      )}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
      >
        ×
      </button>
    </motion.div>
  );
}
