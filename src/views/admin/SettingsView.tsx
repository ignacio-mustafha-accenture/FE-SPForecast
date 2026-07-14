'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Settings, Activity } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/src/lib/cn';
import { AdminView } from './AdminView';
import { MonitoringView } from '../monitoring/MonitoringView';

const panelVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.20, ease: 'easeOut' as const } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

export function SettingsView() {
  const tLayout = useTranslations('layout');
  const t = useTranslations('admin');
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = searchParams.get('view') === 'monitoring' ? 'monitoring' : 'admin';

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.20, ease: 'easeOut' as const }}
        className="text-xl font-bold text-[var(--BK)] mb-4"
      >
        {tLayout('navAdmin')}
      </motion.h1>

      <motion.div
        role="tablist"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.20, delay: 0.07, ease: 'easeOut' as const }}
        className="flex border-b border-[var(--G5)] mb-6"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'admin'}
          onClick={() => router.replace('/admin')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'admin'
              ? 'border-[var(--P)] text-[var(--P)]'
              : 'border-transparent text-[var(--G3)] hover:text-[var(--G1)] hover:border-[var(--G4)]',
          )}
        >
          <Settings size={15} />
          {t('tabAdmin')}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'monitoring'}
          onClick={() => router.replace('/admin?view=monitoring')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'monitoring'
              ? 'border-[var(--P)] text-[var(--P)]'
              : 'border-transparent text-[var(--G3)] hover:text-[var(--G1)] hover:border-[var(--G4)]',
          )}
        >
          <Activity size={15} />
          {t('tabMonitoring')}
        </button>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={panelVariants}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          {activeTab === 'admin' ? <AdminView /> : <MonitoringView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
