'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, X, Plus, UserCheck, UserX, Key, RotateCcw } from 'lucide-react';
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

type TFn = (key: string) => string;

function getEventMeta(action: string, t: TFn): EventMeta {
  if (/^Create ticket:/i.test(action))        return { label: t('historyTicketCreated'), Icon: Plus,      color: 'text-[var(--P)]',  dot: 'bg-[var(--P)]' };
  if (/^Approve ticket/i.test(action))         return { label: t('historyApproved'),      Icon: UserCheck, color: 'text-[var(--GR)]', dot: 'bg-[var(--GR)]' };
  if (/^Reject ticket/i.test(action))          return { label: t('historyRejected'),      Icon: UserX,     color: 'text-[var(--RD)]', dot: 'bg-[var(--RD)]' };
  if (/^Assign EID to ticket/i.test(action))   return { label: t('historyEidAssigned'),   Icon: Key,       color: 'text-[var(--P)]',  dot: 'bg-[var(--P)]' };
  if (/^Reverse PPA/i.test(action))            return { label: t('historyReversed'),      Icon: RotateCcw, color: 'text-purple-600',  dot: 'bg-purple-500' };
  return { label: action, Icon: Plus, color: 'text-[var(--G3)]', dot: 'bg-[var(--G3)]' };
}

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function formatEventDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = `${String(d.getDate()).padStart(2,'0')} ${MONTHS_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
  const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return { date, time };
}

type TimelineRow = {
  key: string;
  label: string;
  description: string;
  Icon: React.ElementType;
  color: string;
  dot: string;
  at: string;
  by: string | null;
  note?: string | null;
  hoursChargeable?: number | null;
  hoursStandard?: number | null;
  reversed?: boolean;
  fromPeriod?: string | null;
  toPeriod?: string | null;
};

function buildPPARows(ppa: Record<string, string | null>, t: TFn, rejectionReason?: string | null, creatorFallback?: string | null): TimelineRow[] {
  const hl = ppa.hours_chargeable != null ? Number(ppa.hours_chargeable) : null;
  const sl = ppa.hours_standard != null ? Number(ppa.hours_standard) : null;
  const fp = ppa.from ?? null;
  const tp = ppa.to ?? null;
  const rows: TimelineRow[] = [];
  if (ppa.created_at) rows.push({ key: 'created', label: t('historyCreated'), description: t('historyRequestChange'), Icon: Plus, color: 'text-[var(--P)]', dot: 'bg-[var(--P)]', at: ppa.created_at, by: ppa.created_by_name ?? ppa.created_by ?? creatorFallback ?? null, hoursChargeable: hl, hoursStandard: sl, fromPeriod: fp, toPeriod: tp });
  if (ppa.resolved_at) {
    const isRej = ppa.status === 'rejected';
    rows.push({ key: 'resolved', label: isRej ? t('historyRejected') : t('historyApproved'), description: isRej ? t('historyRequestRejected') : t('historyChangeApproved'), Icon: isRej ? UserX : UserCheck, color: isRej ? 'text-[var(--RD)]' : 'text-[var(--GR)]', dot: isRej ? 'bg-[var(--RD)]' : 'bg-[var(--GR)]', at: ppa.resolved_at, by: ppa.resolved_by_name ?? ppa.resolved_by ?? null, note: isRej ? (rejectionReason ?? ppa.rejection_reason) : null, hoursChargeable: isRej ? null : hl, hoursStandard: isRej ? null : sl, fromPeriod: fp, toPeriod: tp });
  }
  if (ppa.reversed_at) rows.push({ key: 'reversed', label: t('historyReversed'), description: t('historyChangeReversed'), Icon: RotateCcw, color: 'text-red-600', dot: 'bg-red-500', at: ppa.reversed_at, by: ppa.reversed_by_name ?? ppa.reversed_by ?? null, hoursChargeable: hl, hoursStandard: sl, reversed: true, fromPeriod: fp, toPeriod: tp });
  return rows;
}

function TicketTimeline({ ticketId, ppaLogId, rejectionReason, creatorFallback }: { ticketId: string; ppaLogId?: string | null; rejectionReason?: string | null; creatorFallback?: string | null }) {
  const t = useTranslations('tickets');
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [ppaRows, setPpaRows] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auditFetch = fetch(`/api/admin/audit-log?ticket_id=${ticketId}&page_size=50`, { credentials: 'include' })
      .then((r) => r.json()).then((d) => d.items ?? []).catch(() => []);

    const ppaFetch = ppaLogId
      ? fetch(`/api/ppa/${ppaLogId}`, { credentials: 'include' })
          .then((r) => r.json())
          .then((ppa) => buildPPARows(ppa, t, rejectionReason, creatorFallback))
          .catch(() => [])
      : Promise.resolve([]);

    Promise.all([auditFetch, ppaFetch])
      .then(([audit, ppa]) => { setAuditEvents(audit); setPpaRows(ppa); })
      .finally(() => setLoading(false));
  }, [ticketId, ppaLogId, rejectionReason, creatorFallback]);

  if (loading) return <Skeleton className="h-24 rounded-lg" />;
  if (auditEvents.length === 0 && ppaRows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-[var(--G1)]">{t('historyTitle')}</h2>
      </CardHeader>
      <CardBody>
        <ol className="relative ml-2">
          {/* PPA structured events (always reliable, from ppa_log fields) */}
          {ppaRows.map((row, i) => {
            const { date, time } = formatEventDate(row.at);
            const isLast = i === ppaRows.length - 1 && auditEvents.length === 0;
            return (
              <li key={row.key} className="relative pl-6 pb-5 last:pb-0">
                {!isLast && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-[var(--G5)]" />}
                <span className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${row.dot}`} />
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-sm font-bold ${row.color}`}>{row.label}</span>
                  <span className="text-xs text-[var(--G4)] whitespace-nowrap pt-0.5">{date} · {time}</span>
                </div>
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-[var(--G3)] underline underline-offset-2">{row.description} {t('historyBy')}:</p>
                  <p className="text-xs text-[var(--G2)] font-medium">{row.by ?? '—'}</p>
                </div>
                {(row.fromPeriod || row.toPeriod) && (
                  <p className="text-[11px] text-[var(--G4)] mt-3 font-medium">
                    {row.reversed ? `${row.toPeriod} ← ${row.fromPeriod}` : `${row.fromPeriod} → ${row.toPeriod}`}
                  </p>
                )}
                {(row.hoursChargeable != null || row.hoursStandard != null) && (
                  <div className="flex gap-1.5 mt-1.5">
                    {row.hoursChargeable != null && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        row.key === 'created'  ? 'bg-sky-50 text-sky-700 border-sky-200' :
                        row.key === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                 'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        HL {row.reversed ? '+' : '−'}{row.hoursChargeable}h
                      </span>
                    )}
                    {row.hoursStandard != null && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        row.key === 'created'  ? 'bg-sky-50 text-sky-700 border-sky-200' :
                        row.key === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                 'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        SL {row.reversed ? '+' : '−'}{row.hoursStandard}h
                      </span>
                    )}
                  </div>
                )}
                {row.note && (
                  <div className="mt-2 text-xs bg-red-50 border border-red-100 rounded px-2 py-1.5">
                    <span className="font-semibold text-red-500 uppercase tracking-wider text-[10px]">{t('historyReason')}: </span>
                    <span className="text-red-600 whitespace-pre-wrap">{row.note}</span>
                  </div>
                )}
              </li>
            );
          })}
          {/* Audit log events (for non-PPA tickets: created, assign EID, etc.) */}
          {ppaRows.length === 0 && auditEvents.map((ev, i) => {
            const meta = getEventMeta(ev.action ?? '', t);
            const { date, time } = formatEventDate(ev.created_at);
            const isLast = i === auditEvents.length - 1;
            const isRejection = /^Reject ticket/i.test(ev.action ?? '');
            return (
              <li key={ev.id} className="relative pl-6 pb-5 last:pb-0">
                {!isLast && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-[var(--G5)]" />}
                <span className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${meta.dot}`} />
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                  <span className="text-xs text-[var(--G4)] whitespace-nowrap">{date} · {time}</span>
                </div>
                {ev.user_email && <p className="text-xs text-[var(--G3)] mt-0.5">{ev.user_email}</p>}
                {isRejection && rejectionReason && (
                  <div className="mt-1.5 text-xs bg-red-50 border border-red-100 rounded px-2 py-1.5">
                    <span className="font-semibold text-red-400 uppercase tracking-wider text-[10px]">{t('historyReason')}: </span>
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

  // ppaLogId viene del API; si es null, lo intentamos parsear del campo detail (formato "... (log:89)")
  const effectivePpaLogId = ticket?.ppaLogId ?? ticket?.detail?.match(/\(log:(\d+)\)/)?.[1] ?? null;

  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [reverseSaving, setReverseSaving] = useState(false);

  async function handleReverse() {
    if (!effectivePpaLogId) return;
    setReverseSaving(true);
    try {
      await getClientContainer().reversePPA.execute(effectivePpaLogId);
      toast.success(t('toastReversed'));
      setReverseModalOpen(false);
      router.back();
    } catch {
      toast.error(t('toastReverseError'));
    } finally {
      setReverseSaving(false);
    }
  }

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

  const isPPA = ticket.type === 'ppa';

  const fields: { label: string; value: React.ReactNode }[] = ([
    !isPPA ? { label: t('fieldDetail'), value: ticket.detail } : null,
    { label: t('fieldClient'),        value: ticket.clientName },
    { label: t('fieldOffering'),      value: ticket.offeringType },
    { label: t('fieldChargeability'), value: ticket.chargeabilityPct != null ? `${ticket.chargeabilityPct}%` : null },
    { label: t('fieldNJName'),        value: ticket.njName },
    { label: t('fieldCL'),            value: ticket.cl },
    { label: t('fieldLocation'),      value: ticket.location },
    { label: t('fieldPeopleLead'),    value: ticket.peopleLead },
    { label: t('fieldStartDate'),     value: ticket.startDate },
    { label: t('fieldEndDate'),       value: ticket.endDate },
    ticket.type === 'ppa'
      ? null
      : { label: t('fieldHours'), value: ticket.hoursToMove != null ? `${ticket.hoursToMove}h` : null },
    { label: t('fieldHoursChargeable'), value: ticket.hoursChargeable != null ? `${ticket.hoursChargeable}h` : null },
    { label: t('fieldHoursStandard'),   value: ticket.hoursStandard != null ? `${ticket.hoursStandard}h` : null },
    !isPPA ? { label: t('fieldFromPeriod'), value: ticket.fromPeriod } : null,
    !isPPA ? { label: t('fieldToPeriod'),   value: ticket.toPeriod }  : null,
  ] as ({ label: string; value: React.ReactNode } | null)[]).filter((f): f is { label: string; value: React.ReactNode } => f != null && f.value != null && f.value !== '');

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
        {isAdmin && ticket.type === 'ppa' && ticket.status === 'Approved' && effectivePpaLogId && ticket.ppaLogStatus === 'approved' && (
          <Button variant="reject-outline" size="sm" onClick={() => setReverseModalOpen(true)}>
            <RotateCcw size={13} strokeWidth={2.5} />
            {t('reverseBtn')}
          </Button>
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
          <TicketTimeline ticketId={id} ppaLogId={effectivePpaLogId} rejectionReason={ticket.rejectionReason} creatorFallback={ticket.createdByEmail} />
        </motion.div>
      )}

      {/* Reverse modal */}
      <Modal
        open={reverseModalOpen}
        onClose={() => setReverseModalOpen(false)}
        title={t('reverseModalTitle')}
        width="420px"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--G2)]">{t('reverseModalBody')}</p>
          <div className="flex gap-2">
            <Button variant="reject" className="flex-1" loading={reverseSaving} onClick={handleReverse}>
              {t('reverseModalConfirm')}
            </Button>
            <Button variant="ghost" onClick={() => setReverseModalOpen(false)}>
              {tCommon('cancel')}
            </Button>
          </div>
        </div>
      </Modal>

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
