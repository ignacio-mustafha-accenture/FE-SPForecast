'use client';

import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

import type { Ticket } from '@/src/core/domain/ticket';
import { getClientContainer } from '@/src/application/container';
import { Drawer } from '@/src/components/ui/Drawer';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { Textarea } from '@/src/components/ui/Textarea';
import { Button } from '@/src/components/ui/Button';
import { useToast } from '@/src/hooks/useToast';

type FormData = {
  eid: string;
  type: 'newproj' | 'ongoing' | 'pto' | 'sick' | 'nj' | 'baja';
  detail?: string;
  client_name?: string;
  chargeability_pct?: string;
  hours_to_move?: string;
  from_period?: string;
  to_period?: string;
  comments?: string;
};

interface TicketPanelProps {
  open: boolean;
  ticket: Ticket | null;
  onClose: () => void;
}

export function TicketPanel({ open, ticket, onClose }: TicketPanelProps) {
  const t = useTranslations('ticketPanel');
  const tTickets = useTranslations('tickets');
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const schema = z.object({
    eid: z.string().min(1, t('required')),
    type: z.enum(['newproj', 'ongoing', 'pto', 'sick', 'nj', 'baja']),
    detail: z.string().optional(),
    client_name: z.string().optional(),
    chargeability_pct: z.string().optional(),
    hours_to_move: z.string().optional(),
    from_period: z.string().optional(),
    to_period: z.string().optional(),
    comments: z.string().optional(),
  });

  const TYPE_OPTIONS = [
    { value: 'newproj', label: tTickets('typeNewproj') },
    { value: 'ongoing', label: tTickets('typeOngoing') },
    { value: 'pto', label: tTickets('typePTO') },
    { value: 'sick', label: tTickets('typeSick') },
    { value: 'nj', label: tTickets('typeNJ') },
    { value: 'baja', label: tTickets('typeBaja') },
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    values: ticket
      ? {
          eid: ticket.employeeId,
          type: ticket.type,
          detail: ticket.detail ?? '',
          client_name: ticket.clientName ?? '',
          chargeability_pct: ticket.chargeabilityPct != null ? String(ticket.chargeabilityPct) : '',
          hours_to_move: ticket.hoursToMove != null ? String(ticket.hoursToMove) : '',
          from_period: ticket.fromPeriod ?? '',
          to_period: ticket.toPeriod ?? '',
          comments: ticket.comments ?? '',
        }
      : undefined,
  });

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const payload = {
        ...data,
        chargeability_pct: data.chargeability_pct === '' ? undefined : Number(data.chargeability_pct),
        hours_to_move: data.hours_to_move === '' ? undefined : Number(data.hours_to_move),
      };
      if (ticket) {
        await getClientContainer().updateTicket.execute(ticket.id, payload);
        toast.success(t('toastUpdated'));
      } else {
        await getClientContainer().createTicket.execute(payload);
        toast.success(t('toastCreated'));
      }
      reset();
      onClose();
    } catch {
      toast.error(t('toastError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={ticket ? t('editTitle') : t('createTitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t('eidLabel')}
          placeholder={t('eidPlaceholder')}
          error={errors.eid?.message}
          {...register('eid')}
          disabled={!!ticket}
        />
        <Select
          label={t('typeLabel')}
          options={TYPE_OPTIONS}
          error={errors.type?.message}
          {...register('type')}
        />
        <Input label={t('clientLabel')} placeholder={t('clientPlaceholder')} {...register('client_name')} />
        <Input label={t('chargeabilityLabel')} type="number" min={0} max={100} {...register('chargeability_pct')} />
        <Input label={t('hoursLabel')} type="number" min={0} {...register('hours_to_move')} />
        <Input label={t('fromPeriodLabel')} placeholder={t('fromPeriodPlaceholder')} {...register('from_period')} />
        <Input label={t('toPeriodLabel')} placeholder={t('toPeriodPlaceholder')} {...register('to_period')} />
        <Textarea label={t('detailLabel')} placeholder={t('detailPlaceholder')} {...register('detail')} />
        <Textarea label={t('commentsLabel')} placeholder={t('commentsPlaceholder')} {...register('comments')} />
        <div className="flex gap-2 pt-2">
          <Button type="submit" loading={saving} className="flex-1">
            {ticket ? t('submitEdit') : t('submitCreate')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
