'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';

import { useAuthStore, useForecastStore } from '@/src/store/StoreProvider';
import { getClientContainer } from '@/src/application/container';
import { useToast } from '@/src/hooks/useToast';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/src/components/ui/Card';
import { Modal } from '@/src/components/ui/Modal';
import { Skeleton } from '@/src/components/ui/Skeleton';

const typeVariant: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'neutral' | 'purple'> = {
  newproj: 'green',
  ongoing: 'blue',
  pto: 'yellow',
  sick: 'yellow',
  nj: 'red',
  baja: 'red',
};

const statusVariant: Record<string, 'yellow' | 'green' | 'red' | 'neutral'> = {
  Open: 'yellow',
  Approved: 'green',
  Rejected: 'red',
};

const headerStyle: Record<string, { bg: string; border: string }> = {
  Open:     { bg: 'bg-amber-50',  border: 'border-amber-400' },
  Approved: { bg: 'bg-green-50',  border: 'border-green-400' },
  Rejected: { bg: 'bg-red-50',    border: 'border-red-400' },
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2.5 border-b border-[var(--G6)] last:border-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--G3)] mb-0.5">{label}</p>
      <p className="text-sm text-[var(--G1)]">{value ?? <span className="text-[var(--G4)]">—</span>}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-[var(--G1)]">{title}</h2>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

interface Props {
  id: string;
}

export function TicketDetailView({ id }: Props) {
  const t = useTranslations('tickets');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const toast = useToast();

  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const isLoading = useForecastStore((s) => s.isLoading);
  const ticket = useForecastStore((s) =>
    (s.appState?.tickets ?? []).find((tk) => tk.id === id) ?? null,
  );

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);

  const typeLabel: Record<string, string> = {
    newproj: t('typeNewproj'),
    ongoing: t('typeOngoing'),
    pto:     t('typePTO'),
    sick:    t('typeSick'),
    nj:      t('typeNJ'),
    baja:    t('typeBaja'),
  };

  const statusLabel: Record<string, string> = {
    Open:     t('statusOpen'),
    Approved: t('statusApproved'),
    Rejected: t('statusRejected'),
  };

  async function handleApprove() {
    if (!ticket) return;
    try {
      await getClientContainer().approveTicket.execute(ticket.id);
      toast.success(t('toastApproved'));
      router.back();
    } catch {
      toast.error(t('toastApproveError'));
    }
  }

  function openRejectModal() {
    setRejectReason('');
    setRejectModalOpen(true);
  }

  async function handleRejectConfirm() {
    if (!ticket || !rejectReason.trim()) return;
    setRejectSaving(true);
    try {
      await getClientContainer().rejectTicket.execute(ticket.id, rejectReason.trim());
      toast.success(t('toastRejected'));
      setRejectModalOpen(false);
      router.back();
    } catch {
      toast.error(t('toastRejectError'));
    } finally {
      setRejectSaving(false);
    }
  }

  if (isLoading && !ticket) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (!ticket) {
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

  const style = headerStyle[ticket.status] ?? { bg: 'bg-gray-50', border: 'border-gray-400' };

  return (
    <div className="space-y-4">

      {/* Top bar: back + admin actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-[var(--G3)] hover:text-[var(--P)] transition-colors"
        >
          ← {t('detailBack')}
        </button>
        {isAdmin && ticket.status === 'Open' && (
          <div className="flex items-center gap-2">
            <Button variant="approve-outline" size="sm" onClick={handleApprove}>
              <Check size={13} strokeWidth={2.5} />
              {t('approve')}
            </Button>
            <Button variant="reject-outline" size="sm" onClick={openRejectModal}>
              <X size={13} strokeWidth={2.5} />
              {t('reject')}
            </Button>
          </div>
        )}
      </div>

      {/* Hero header */}
      <div className={`rounded-lg border-l-4 ${style.bg} ${style.border} border border-[var(--G5)] px-6 py-4`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={typeVariant[ticket.type] ?? 'neutral'}>
                {typeLabel[ticket.type] ?? ticket.type}
              </Badge>
              <h1 className="text-xl font-bold text-[var(--BK)]">{ticket.employeeName}</h1>
            </div>
            <p className="text-sm text-[var(--G3)]">
              {ticket.country}
              {ticket.by && <> · {t('fieldCreatedBy')}: <span className="text-[var(--G2)]">{ticket.by}</span></>}
              {ticket.date && <> · {ticket.date}</>}
            </p>
          </div>
          <Badge variant={statusVariant[ticket.status] ?? 'neutral'}>
            {statusLabel[ticket.status] ?? ticket.status}
          </Badge>
        </div>
      </div>

      {/* Details */}
      <Section title={t('sectionDetails')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6">
          <Field label={t('fieldDetail')}       value={ticket.detail} />
          <Field label={t('fieldClient')}        value={ticket.clientName} />
          <Field label={t('fieldOffering')}      value={ticket.offeringType} />
          <Field label={t('fieldChargeability')} value={ticket.chargeabilityPct != null ? `${ticket.chargeabilityPct}%` : null} />
          <Field label={t('fieldCL')}            value={ticket.cl} />
          <Field label={t('fieldLocation')}      value={ticket.location} />
          <Field label={t('fieldPeopleLead')}    value={ticket.peopleLead} />
          <Field label={t('fieldNJName')}        value={ticket.njName} />
        </div>
      </Section>

      {/* Dates */}
      <Section title={t('sectionDates')}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6">
          <Field label={t('fieldStartDate')}  value={ticket.startDate} />
          <Field label={t('fieldEndDate')}    value={ticket.endDate} />
          <Field label={t('fieldFromPeriod')} value={ticket.fromPeriod} />
          <Field label={t('fieldToPeriod')}   value={ticket.toPeriod} />
        </div>
      </Section>

      {/* Hours transfer — only if hoursToMove */}
      {ticket.hoursToMove != null && (
        <Section title={t('sectionHours')}>
          <div className="grid grid-cols-3 gap-x-6">
            <Field label={t('fieldHours')}      value={`${ticket.hoursToMove}h`} />
            <Field label={t('fieldFromPeriod')} value={ticket.fromPeriod} />
            <Field label={t('fieldToPeriod')}   value={ticket.toPeriod} />
          </div>
        </Section>
      )}

      {/* Comments */}
      {ticket.comments && (
        <Section title={t('sectionComments')}>
          <p className="text-sm text-[var(--G1)] whitespace-pre-wrap">{ticket.comments}</p>
        </Section>
      )}

      {/* Rejection reason */}
      {ticket.rejectionReason && (
        <Section title={t('sectionRejection')}>
          <p className="text-sm text-[var(--G1)] whitespace-pre-wrap">{ticket.rejectionReason}</p>
        </Section>
      )}

      {/* Reject modal */}
      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={t('rejectModalTitle')}
        width="480px"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--G1)]">
              {t('rejectModalReasonLabel')}
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('rejectModalReasonPlaceholder')}
              rows={4}
              className="w-full rounded border border-[var(--G5)] bg-white px-3 py-2 text-sm text-[var(--G1)] placeholder:text-[var(--G4)] focus:outline-none focus:border-[var(--P)] focus:ring-1 focus:ring-[var(--P)] transition-colors resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="reject"
              className="flex-1"
              loading={rejectSaving}
              disabled={!rejectReason.trim()}
              onClick={handleRejectConfirm}
            >
              {t('rejectModalConfirm')}
            </Button>
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
