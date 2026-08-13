'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, X, Plus, UserCheck, UserX, Key } from 'lucide-react';
import { motion } from 'framer-motion';

import type { Ticket } from '@/src/core/domain/ticket';
import { useAuthStore, useForecastStore } from '@/src/store/StoreProvider';
import { getClientContainer } from '@/src/application/container';
import { useToast } from '@/src/hooks/useToast';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/src/components/ui/Card';
import { Modal } from '@/src/components/ui/Modal';
import { Skeleton } from '@/src/components/ui/Skeleton';

const page = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' as const } },
};

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

type AuditEvent = {
  id: number;
  created_at: string;
  user_email: string | null;
  action: string | null;
};

type EventMeta = { label: string; Icon: React.ElementType; color: string; dot: string };

function getEventMeta(action: string): EventMeta {
  if (/^Create ticket:/i.test(action))        return { label: 'Ticket creado',   Icon: Plus,      color: 'text-[var(--P)]',  dot: 'bg-[var(--P)]' };
  if (/^Approve ticket/i.test(action))         return { label: 'Aprobado',        Icon: UserCheck, color: 'text-[var(--GR)]', dot: 'bg-[var(--GR)]' };
  if (/^Reject ticket/i.test(action))          return { label: 'Rechazado',       Icon: UserX,     color: 'text-[var(--RD)]', dot: 'bg-[var(--RD)]' };
  if (/^Assign EID to ticket/i.test(action))   return { label: 'EID asignado',    Icon: Key,       color: 'text-[var(--P)]',  dot: 'bg-[var(--P)]' };
  return { label: action, Icon: Plus, color: 'text-[var(--G3)]', dot: 'bg-[var(--G3)]' };
}

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function formatEventDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = `${String(d.getDate()).padStart(2,'0')} ${MONTHS_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
  const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return { date, time };
}

function TicketTimeline({ ticketId, rejectionReason }: { ticketId: string; rejectionReason?: string | null }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/audit-log?ticket_id=${ticketId}&page_size=50`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setEvents((d.items ?? []).slice().reverse()))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticketId]);

  if (loading) return <Skeleton className="h-24 rounded-lg" />;
  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-[var(--G1)]">Historial</h2>
      </CardHeader>
      <CardBody>
        <ol className="relative ml-2">
          {events.map((ev, i) => {
            const meta = getEventMeta(ev.action ?? '');
            const { date, time } = formatEventDate(ev.created_at);
            const isLast = i === events.length - 1;
            const isRejection = /^Reject ticket/i.test(ev.action ?? '');
            return (
              <li key={ev.id} className="relative pl-6 pb-5 last:pb-0">
                {!isLast && (
                  <span className="absolute left-[7px] top-4 bottom-0 w-px bg-[var(--G5)]" />
                )}
                <span className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${meta.dot}`} />
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                  <span className="text-xs text-[var(--G4)] whitespace-nowrap">{date} · {time}</span>
                </div>
                {ev.user_email && (
                  <p className="text-xs text-[var(--G3)] mt-0.5">{ev.user_email}</p>
                )}
                {isRejection && rejectionReason && (
                  <div className="mt-1.5 text-xs bg-red-50 border border-red-100 rounded px-2 py-1.5">
                    <span className="font-semibold text-red-400 uppercase tracking-wider">Motivo: </span>
                    <span className="text-red-600 whitespace-pre-wrap">{rejectionReason}</span>
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

export function TicketDetailView({ id }: Props) {
  const t = useTranslations('tickets');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const toast = useToast();

  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const fetchState = useForecastStore((s) => s.fetchState);
  const windowOffset = useForecastStore((s) => s.windowOffset);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    getClientContainer()
      .getTicketById.execute(id)
      .then((t) => setTicket(t))
      .catch(() => setTicket(null))
      .finally(() => setFetchAttempted(true));
     
  }, [id]);

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
      await fetchState(windowOffset);
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

  if (!fetchAttempted) {
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

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: t('fieldDetail'),       value: ticket.detail },
    { label: t('fieldClient'),        value: ticket.clientName },
    { label: t('fieldOffering'),      value: ticket.offeringType },
    { label: t('fieldChargeability'), value: ticket.chargeabilityPct != null ? `${ticket.chargeabilityPct}%` : null },
    { label: t('fieldNJName'),        value: ticket.njName },
    { label: t('fieldCL'),            value: ticket.cl },
    { label: t('fieldLocation'),      value: ticket.location },
    { label: t('fieldPeopleLead'),    value: ticket.peopleLead },
    { label: t('fieldStartDate'),     value: ticket.startDate },
    { label: t('fieldEndDate'),       value: ticket.endDate },
    { label: t('fieldHours'),         value: ticket.hoursToMove != null ? `${ticket.hoursToMove}h` : null },
    { label: t('fieldFromPeriod'),    value: ticket.fromPeriod },
    { label: t('fieldToPeriod'),      value: ticket.toPeriod },
  ].filter((f) => f.value != null && f.value !== '');

  const hasBody = fields.length > 0;

  return (
    <motion.div className="space-y-4" variants={page} initial="hidden" animate="show">

      {/* Top bar: back + admin actions */}
      <motion.div variants={item} className="flex items-center justify-between">
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
      </motion.div>

      {/* Unified ticket card */}
      <motion.div variants={item} className="rounded-lg border border-[var(--G5)] overflow-hidden shadow-sm">

        {/* Colored header */}
        <div className={`border-l-4 ${style.bg} ${style.border} px-6 py-5`}>
          {/* Top row: type (left) · status (right) */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <Badge variant={typeVariant[ticket.type] ?? 'neutral'}>
              {typeLabel[ticket.type] ?? ticket.type}
            </Badge>
            <Badge variant={statusVariant[ticket.status] ?? 'neutral'}>
              {statusLabel[ticket.status] ?? ticket.status}
            </Badge>
          </div>
          {/* Name */}
          <h1 className="text-xl font-bold text-[var(--BK)]">{ticket.employeeName}</h1>
          {/* Meta */}
          <p className="text-xs text-[var(--G4)] mt-1">
            {[
              ticket.country,
              ticket.by ? `${t('fieldCreatedBy')}: ${ticket.by}` : null,
              ticket.date,
            ].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Body */}
        {hasBody && (
          <div className="bg-white px-6 py-4 space-y-4">
            {fields.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10">
                {fields.map(({ label, value }) => (
                  <Field key={label} label={label} value={value} />
                ))}
              </div>
            )}

          </div>
        )}
      </motion.div>

      {/* Timeline — admin only */}
      {isAdmin && (
        <motion.div variants={item}>
          <TicketTimeline ticketId={id} rejectionReason={ticket.rejectionReason} />
        </motion.div>
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
    </motion.div>
  );
}
