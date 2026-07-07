'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

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
  leave: 'neutral',
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
  const t = useTranslations('employeeDrawer');
  const toast = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit } = useForm<EditForm>({
    values: employee ? { project: employee.client ?? '', notes: employee.notes } : undefined,
  });

  async function onSave(data: EditForm) {
    if (!employee) return;
    setSaving(true);
    try {
      await getClientContainer().updateEmployee.execute(employee.id, {
        client: data.project || null,
        notes: data.notes,
      });
      toast.success(t('updateSuccess'));
      onClose();
    } catch {
      toast.error(t('updateError'));
    } finally {
      setSaving(false);
    }
  }

  function goToDetail() {
    if (employee) {
      router.push(`/employees/${employee.id}`);
      onClose();
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={employee?.name ?? t('title')}>
      {employee ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant[employee.chargeabilityStatus]}>{employee.level}</Badge>
              <span className="text-xs text-[var(--G3)]">{employee.id}</span>
            </div>
            <button
              onClick={goToDetail}
              className="text-xs text-[var(--P)] hover:underline"
            >
              Ver detalle →
            </button>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--G3)] uppercase tracking-wide font-medium">{t('chargeability')}</p>
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
              {t('hoursAvailable', { available: employee.availableHours, total: employee.totalHours })}
            </p>
          </div>
          <form onSubmit={handleSubmit(onSave)} className="space-y-3 pt-2 border-t border-[var(--G5)]">
            <Input label={t('projectLabel')} placeholder={t('projectPlaceholder')} {...register('project')} />
            <Textarea label={t('notesLabel')} placeholder={t('notesPlaceholder')} {...register('notes')} />
            <div className="flex gap-2 pt-2">
              <Button type="submit" loading={saving} className="flex-1">
                {t('save')}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose}>
                {t('cancel')}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </Drawer>
  );
}
