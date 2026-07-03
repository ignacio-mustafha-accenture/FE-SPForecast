'use client';

import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { Ticket } from '@/src/core/domain/ticket';
import { getClientContainer } from '@/src/application/container';
import { Drawer } from '@/src/components/ui/Drawer';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { Textarea } from '@/src/components/ui/Textarea';
import { Button } from '@/src/components/ui/Button';
import { useToast } from '@/src/hooks/useToast';

const schema = z.object({
  eid: z.string().min(1, 'Requerido'),
  type: z.enum(['newproj', 'ongoing', 'pto', 'sick', 'nj', 'baja']),
  detail: z.string().optional(),
  client_name: z.string().optional(),
  chargeability_pct: z.string().optional(),
  hours_to_move: z.string().optional(),
  from_period: z.string().optional(),
  to_period: z.string().optional(),
  comments: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const TYPE_OPTIONS = [
  { value: 'newproj', label: 'Nuevo proyecto' },
  { value: 'ongoing', label: 'En curso' },
  { value: 'pto', label: 'Vacaciones' },
  { value: 'sick', label: 'Enfermedad' },
  { value: 'nj', label: 'No justificado' },
  { value: 'baja', label: 'Baja' },
];

interface TicketPanelProps {
  open: boolean;
  ticket: Ticket | null;
  onClose: () => void;
}

export function TicketPanel({ open, ticket, onClose }: TicketPanelProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

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
        toast.success('Ticket actualizado');
      } else {
        await getClientContainer().createTicket.execute(payload);
        toast.success('Ticket creado');
      }
      reset();
      onClose();
    } catch {
      toast.error('Error al guardar ticket');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={ticket ? 'Editar ticket' : 'Nuevo ticket'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="EID del empleado"
          placeholder="ramos.lucas"
          error={errors.eid?.message}
          {...register('eid')}
          disabled={!!ticket}
        />
        <Select
          label="Tipo"
          options={TYPE_OPTIONS}
          error={errors.type?.message}
          {...register('type')}
        />
        <Input label="Cliente" placeholder="Google" {...register('client_name')} />
        <Input label="Chargeability %" type="number" min={0} max={100} {...register('chargeability_pct')} />
        <Input label="Horas a mover" type="number" min={0} {...register('hours_to_move')} />
        <Input label="Desde período" placeholder="Jun-P1" {...register('from_period')} />
        <Input label="Hasta período" placeholder="Jun-P2" {...register('to_period')} />
        <Textarea label="Detalle" placeholder="Descripción..." {...register('detail')} />
        <Textarea label="Comentarios" placeholder="Notas adicionales..." {...register('comments')} />
        <div className="flex gap-2 pt-2">
          <Button type="submit" loading={saving} className="flex-1">
            {ticket ? 'Guardar cambios' : 'Crear ticket'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
