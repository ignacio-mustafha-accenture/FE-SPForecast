'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
  employeeId: z.string().min(1, 'Requerido'),
  type: z.enum(['newproj', 'ongoing', 'pto', 'sick', 'nj', 'baja']),
  hours: z.number().positive('Debe ser > 0'),
  startDate: z.string().min(1, 'Requerido'),
  endDate: z.string().min(1, 'Requerido'),
  notes: z.string().optional(),
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
    resolver: zodResolver(schema),
    values: ticket
      ? {
          employeeId: ticket.employeeId,
          type: ticket.type,
          hours: ticket.hours,
          startDate: ticket.startDate,
          endDate: ticket.endDate,
          notes: ticket.notes,
        }
      : undefined,
  });

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      if (ticket) {
        await getClientContainer().updateTicket.execute(ticket.id, {
          hours: data.hours,
          startDate: data.startDate,
          endDate: data.endDate,
          notes: data.notes,
        });
        toast.success('Ticket actualizado');
      } else {
        await getClientContainer().createTicket.execute(data);
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
          label="ID de empleado"
          placeholder="emp-123"
          error={errors.employeeId?.message}
          {...register('employeeId')}
          disabled={!!ticket}
        />
        <Select
          label="Tipo"
          options={TYPE_OPTIONS}
          error={errors.type?.message}
          {...register('type')}
        />
        <Input
          label="Horas"
          type="number"
          min={1}
          error={errors.hours?.message}
          {...register('hours', { valueAsNumber: true })}
        />
        <Input
          label="Fecha inicio"
          type="date"
          error={errors.startDate?.message}
          {...register('startDate')}
        />
        <Input
          label="Fecha fin"
          type="date"
          error={errors.endDate?.message}
          {...register('endDate')}
        />
        <Textarea label="Notas" placeholder="Comentarios..." {...register('notes')} />
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
