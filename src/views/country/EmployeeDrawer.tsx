'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import type { Employee } from '@/src/core/domain/employee';
import { getClientContainer } from '@/src/application/container';
import { Drawer } from '@/src/components/ui/Drawer';
import { Badge } from '@/src/components/ui/Badge';
import { Input } from '@/src/components/ui/Input';
import { Textarea } from '@/src/components/ui/Textarea';
import { Button } from '@/src/components/ui/Button';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { useToast } from '@/src/hooks/useToast';
import { formatPercent } from '@/src/lib/formatters';

const statusVariant = {
  green: 'green',
  yellow: 'yellow',
  red: 'red',
  unassigned: 'neutral',
} as const;

interface EmployeeDrawerProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
}

interface EditForm {
  project: string;
  notes: string;
}

export function EmployeeDrawer({ open, employee, onClose }: EmployeeDrawerProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit } = useForm<EditForm>({
    values: employee ? { project: employee.project ?? '', notes: employee.notes } : undefined,
  });

  async function onSave(data: EditForm) {
    if (!employee) return;
    setSaving(true);
    try {
      await getClientContainer().updateEmployee.execute(employee.id, {
        project: data.project || null,
        notes: data.notes,
      });
      toast.success('Empleado actualizado');
      onClose();
    } catch {
      toast.error('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={employee?.name ?? 'Empleado'}>
      {employee ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[employee.chargeabilityStatus]}>{employee.level}</Badge>
            <span className="text-xs text-[var(--G3)]">{employee.email}</span>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--G3)] uppercase tracking-wide font-medium">Chargeability</p>
            <div className="flex items-center gap-2">
              <ProgressBar
                value={employee.chargeabilityPercent}
                max={1}
                color={
                  employee.chargeabilityStatus === 'green'
                    ? 'var(--GR)'
                    : employee.chargeabilityStatus === 'yellow'
                      ? 'var(--YL)'
                      : 'var(--RD)'
                }
                className="flex-1"
              />
              <span className="text-sm font-bold text-[var(--G1)]">
                {formatPercent(employee.chargeabilityPercent)}
              </span>
            </div>
            <p className="text-xs text-[var(--G3)]">
              {employee.availableHours}h disponibles / {employee.totalHours}h totales
            </p>
          </div>
          <form onSubmit={handleSubmit(onSave)} className="space-y-3 pt-2 border-t border-[var(--G5)]">
            <Input label="Proyecto" placeholder="Sin proyecto" {...register('project')} />
            <Textarea label="Notas" placeholder="Comentarios..." {...register('notes')} />
            <div className="flex gap-2 pt-2">
              <Button type="submit" loading={saving} className="flex-1">
                Guardar
              </Button>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </Drawer>
  );
}
