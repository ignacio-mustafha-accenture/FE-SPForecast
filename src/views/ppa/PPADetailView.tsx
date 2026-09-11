'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

import type { PPALog } from '@/src/core/domain/ppa';
import { useAuthStore } from '@/src/store/StoreProvider';
import { getClientContainer } from '@/src/application/container';
import { useToast } from '@/src/hooks/useToast';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/src/components/ui/Card';
import { Modal } from '@/src/components/ui/Modal';
import { Skeleton } from '@/src/components/ui/Skeleton';

const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' as const } },
};

const statusVariant: Record<string, 'yellow' | 'green' | 'red' | 'purple' | 'neutral'> = {
  pending:  'yellow',
  approved: 'green',
  rejected: 'red',
  reversed: 'purple',
};

const headerStyle: Record<string, { bg: string; border: string }> = {
  pending:  { bg: 'bg-amber-50',  border: 'border-amber-400' },
  approved: { bg: 'bg-green-50',  border: 'border-green-400' },
  rejected: { bg: 'bg-red-50',    border: 'border-red-400' },
  reversed: { bg: 'bg-purple-50', border: 'border-purple-400' },
};

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function formatTs(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = `${String(d.getDate()).padStart(2,'0')} ${MONTHS_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
  const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return { date, time };
}

type TimelineEvent = {
  key: string;
  label: string;
  by: string | null | undefined;
  at: string | null | undefined;
  dot: string;
  color: string;
  note?: string | null;
};

function PPATimeline({ ppa }: { ppa: PPALog }) {
  const t = useTranslations('ppa');
  const events: TimelineEvent[] = [];

  if (ppa.createdAt) {
    events.push({
      key: 'created',
      label: t('historyCreated'),
      by: ppa.createdBy,
      at: ppa.createdAt,
      dot: 'bg-[var(--P)]',
      color: 'text-[var(--P)]',
    });
  }

  if (ppa.resolvedAt) {
    const isRejected = ppa.status === 'rejected' || (ppa.status === 'reversed' && ppa.rejectionReason);
    events.push({
      key: 'resolved',
      label: ppa.status === 'rejected' ? t('historyRejected') : t('historyApproved'),
      by: ppa.resolvedBy,
      at: ppa.resolvedAt,
      dot: isRejected ? 'bg-[var(--RD)]' : 'bg-[var(--GR)]',
      color: isRejected ? 'text-[var(--RD)]' : 'text-[var(--GR)]',
      note: ppa.rejectionReason,
    });
  }

  if (ppa.reversedAt) {
    events.push({
      key: 'reversed',
      label: t('historyReversed'),
      by: ppa.reversedBy,
      at: ppa.reversedAt,
      dot: 'bg-purple-500',
      color: 'text-purple-600',
    });
  }

  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-[var(--G1)]">{t('historyTitle')}</h2>
      </CardHeader>
      <CardBody>
        <ol className="relative ml-2">
          {events.map((ev, i) => {
            const formatted = formatTs(ev.at!);
            const isLast = i === events.length - 1;
            return (
              <li key={ev.key} className="relative pl-6 pb-5 last:pb-0">
                {!isLast && (
                  <span className="absolute left-[7px] top-4 bottom-0 w-px bg-[var(--G5)]" />
                )}
                <span className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${ev.dot}`} />
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-sm font-semibold ${ev.color}`}>{ev.label}</span>
                  <span className="text-xs text-[var(--G4)] whitespace-nowrap">{formatted.date} · {formatted.time}</span>
                </div>
                {ev.by && (
                  <p className="text-xs text-[var(--G3)] mt-0.5">{ev.by}</p>
                )}
                {ev.note && (
                  <div className="mt-1.5 text-xs bg-red-50 border border-red-100 rounded px-2 py-1.5">
                    <span className="font-semibold text-red-400 uppercase tracking-wider">Motivo: </span>
                    <span className="text-red-600 whitespace-pre-wrap">{ev.note}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--G3)] mb-0.5">{label}</p>
      <p className="text-sm text-[var(--G1)]">{value}</p>
    </div>
  );
}

interface Props {
  id: string;
}

export function PPADetailView({ id }: Props) {
  const t = useTranslations('ppa');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const toast = useToast();

  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const [ppa, setPpa] = useState<PPALog | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    getClientContainer()
      .getPPAById.execute(id)
      .then((p) => setPpa(p))
      .catch(() => setPpa(null))
      .finally(() => setFetchAttempted(true));
  }, [id]);

  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [reverseSaving, setReverseSaving] = useState(false);

  async function handleReverse() {
    if (!ppa) return;
    setReverseSaving(true);
    try {
      await getClientContainer().reversePPA.execute(ppa.id);
      toast.success(t('toastReversed'));
      setReverseModalOpen(false);
      // Reload detail
      const updated = await getClientContainer().getPPAById.execute(id);
      setPpa(updated);
    } catch {
      toast.error(t('toastReverseError'));
    } finally {
      setReverseSaving(false);
    }
  }

  const statusLabel: Record<string, string> = {
    pending:  t('statusPending'),
    approved: t('statusApproved'),
    rejected: t('statusRejected'),
    reversed: t('statusReversed'),
  };

  if (!fetchAttempted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (!ppa) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="text-sm text-[var(--P)] hover:underline"
        >
          ← {t('detailBack')}
        </button>
        <p className="text-sm text-[var(--G3)]">{t('detailNotFound')}</p>
      </div>
    );
  }

  const style = headerStyle[ppa.status] ?? { bg: 'bg-gray-50', border: 'border-gray-400' };

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: t('fieldFrom'),            value: ppa.fromPeriod },
    { label: t('fieldTo'),              value: ppa.toPeriod },
    { label: t('fieldHoursChargeable'), value: ppa.hoursChargeable != null ? `${ppa.hoursChargeable}h` : null },
    { label: t('fieldHoursStandard'),   value: ppa.hoursStandard != null ? `${ppa.hoursStandard}h` : null },
    { label: t('fieldReason'),          value: ppa.reason },
  ].filter((f) => f.value != null && f.value !== '');

  return (
    <motion.div className="space-y-4" variants={pageVariants} initial="hidden" animate="show">

      {/* Top bar */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-[var(--G3)] hover:text-[var(--P)] transition-colors"
        >
          ← {t('detailBack')}
        </button>
        {isAdmin && ppa.status === 'approved' && (
          <Button variant="reject-outline" size="sm" onClick={() => setReverseModalOpen(true)}>
            <RotateCcw size={13} strokeWidth={2.5} />
            {t('reverse')}
          </Button>
        )}
      </motion.div>

      {/* PPA card */}
      <motion.div variants={itemVariants} className="rounded-lg border border-[var(--G5)] overflow-hidden shadow-sm">

        {/* Colored header */}
        <div className={`border-l-4 ${style.bg} ${style.border} px-6 py-5`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <Badge variant="neutral">PPA</Badge>
            <Badge variant={statusVariant[ppa.status] ?? 'neutral'}>
              {statusLabel[ppa.status] ?? ppa.status}
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-[var(--BK)]">{ppa.employeeName}</h1>
          <p className="text-xs text-[var(--G4)] mt-1">
            {[
              ppa.country,
              ppa.createdBy ? `${t('fieldCreatedBy')}: ${ppa.createdBy}` : null,
              ppa.appliedAt,
            ].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Fields */}
        {fields.length > 0 && (
          <div className="bg-white px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10">
              {fields.map(({ label, value }) => (
                <Field key={label} label={label} value={value} />
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Timeline */}
      <motion.div variants={itemVariants}>
        <PPATimeline ppa={ppa} />
      </motion.div>

      {/* Reverse confirm modal */}
      <Modal
        open={reverseModalOpen}
        onClose={() => setReverseModalOpen(false)}
        title={t('reverseModalTitle')}
        width="420px"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--G2)]">{t('reverseModalBody')}</p>
          <div className="flex gap-2">
            <Button
              variant="reject"
              className="flex-1"
              loading={reverseSaving}
              onClick={handleReverse}
            >
              {t('reverseModalConfirm')}
            </Button>
            <Button variant="ghost" onClick={() => setReverseModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
