'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
}

export function Drawer({ open, onClose, title, children, width = '420px' }: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeInOut' as const }}
            className="fixed right-0 top-0 h-full z-50 bg-white shadow-xl flex flex-col"
            style={{ width }}
          >
            <div className="flex items-center justify-between border-b border-[var(--G5)] px-5 py-3">
              {title && <h2 className="text-base font-semibold text-[var(--G1)]">{title}</h2>}
              <button
                onClick={onClose}
                className="ml-auto text-[var(--G3)] hover:text-[var(--G1)] transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
