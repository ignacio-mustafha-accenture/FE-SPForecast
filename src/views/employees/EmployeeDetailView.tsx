'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import type { Employee } from '@/src/core/domain/employee';
import { useForecastStore } from '@/src/store/StoreProvider';
import { getClientContainer } from '@/src/application/container';
import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Textarea } from '@/src/components/ui/Textarea';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { useToast } from '@/src/hooks/useToast';
import { formatPercent } from '@/src/lib/formatters';

const statusVariant = {
  green: 'green',
  yellow: 'yellow',
  red: 'red',
  unassigned: 'neutral',
  leave: 'neutral',
} as const;

interface EditForm {
  client: string;
  offering: string;
  rollOn: string;
  rollOff: string;
  chargeabilityPct: string;
  accountManager: string;
  nextClient: string;
  notes: string;
}

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between py-2 border-b border-[var(--G6)] text-sm">
      <span className="text-[var(--G3)] font-medium">{label}</span>
      <span className="text-[var(--G1)] text-right">{value ?? '—'}</span>
    </div>
  );
}

interface Props {
  eid: string;
}

export function EmployeeDetailView({ eid }: Props) {
  const t = useTranslations('employeeDetail');
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const employee = useForecastStore((s) =>
    s.appState?.employees.find((e) => e.id === eid) ?? null,
  );
  const periods = useForecastStore((s) => s.appState?.periods ?? []);
  const isLoading = useForecastStore((s) => s.isLoading);

  const { register, handleSubmit } = useForm<EditForm>({
    values: employee
      ? {
          client: employee.client ?? '',
          offering: employee.projectType ?? '',
          rollOn: employee.rollOn ?? '',
          rollOff: employee.rollOff ?? '',
          chargeabilityPct: employee.chargeabilityPercent > 0
            ? String(Math.round(employee.chargeabilityPercent * 100))
            : '',
          accountManager: employee.manager ?? '',
          nextClient: '',
          notes: employee.notes,
        }
      : undefined,
  });

  async function onSave(data: EditForm) {
    if (!employee) return;
    setSaving(true);
    try {
      await getClientContainer().updateEmployee.execute(employee.id, {
        client: data.client || null,
        offering: data.offering || null,
        rollOn: data.rollOn || null,
        rollOff: data.rollOff || null,
        chargeabilityPct: data.chargeabilityPct ? Number(data.chargeabilityPct) : null,
        accountManager: data.accountManager || null,
        nextClient: data.nextClient || null,
        notes: data.notes || null,
      });
      toast.success(t('savedOk'));
    } catch {
      toast.error(t('savedError'));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading && !employee) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="text-sm text-[var(--P)] hover:underline">
          {t('back')}
        </button>
        <p className="text-[var(--G3)] text-sm">Empleado no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-[var(--P)] hover:underline mb-2 block">
            {t('back')}
          </button>
          <h1 className="text-xl font-bold text-[var(--BK)]">{employee.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={statusVariant[employee.chargeabilityStatus]}>{employee.level}</Badge>
            <span className="text-sm text-[var(--G3)]">{employee.id}</span>
            <span className="text-sm text-[var(--G3)]">·</span>
            <span className="text-sm text-[var(--G3)]">{employee.country}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end mb-1">
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
              className="w-32"
            />
            <span className="text-lg font-bold text-[var(--G1)]">
              {formatPercent(employee.chargeabilityPercent)}
            </span>
          </div>
          <p className="text-xs text-[var(--G3)]">
            {employee.availableHours}h disponibles / {employee.totalHours}h totales
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--G1)]">{t('sectionInfo')}</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-0">
              <InfoRow label={t('fieldEID')} value={employee.id} />
              <InfoRow label={t('fieldName')} value={employee.name} />
              <InfoRow label={t('fieldCL')} value={employee.level} />
              <InfoRow label={t('fieldCountry')} value={employee.country} />
              <InfoRow label={t('fieldManager')} value={employee.manager} />
              <InfoRow label={t('fieldHireDate')} value={employee.hireDate} />
              <InfoRow label={t('fieldFAD')} value={employee.fad} />
              <InfoRow label={t('fieldRollOff')} value={employee.rollOff} />
              <InfoRow label={t('fieldDays')} value={employee.daysToAvailable > 0 ? `${employee.daysToAvailable} días` : null} />
              <InfoRow label={t('fieldNextPTO')} value={employee.nextPTO} />
              <InfoRow label={t('fieldPTOHours')} value={employee.nextPTOHours != null ? `${employee.nextPTOHours}h` : null} />
              <InfoRow
                label={t('fieldNJ')}
                value={employee.newJoiner ? <Badge variant="blue">New Joiner</Badge> : 'No'}
              />
            </div>
          </CardBody>
        </Card>

        {/* Editar */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--G1)]">{t('sectionEdit')}</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit(onSave)} className="space-y-3">
              <Input label={t('fieldClient')} placeholder="Google" {...register('client')} />
              <Input label={t('fieldOffering')} placeholder="CTO" {...register('offering')} />
              <Input label={t('fieldRollOn')} placeholder="DD/MM/YY" {...register('rollOn')} />
              <Input label={t('fieldRollOff')} placeholder="DD/MM/YY" {...register('rollOff')} />
              <Input label={t('fieldChargeabilityPct')} type="number" min={0} max={100} {...register('chargeabilityPct')} />
              <Input label={t('fieldAccountManager')} placeholder="smith.john" {...register('accountManager')} />
              <Input label={t('fieldNextClient')} placeholder="Próximo cliente" {...register('nextClient')} />
              <Textarea label={t('fieldNotes')} placeholder="Notas..." {...register('notes')} />
              <Button type="submit" loading={saving} className="w-full">
                {t('saveBtn')}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      {/* Forecast histórico */}
      {periods.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--G1)]">{t('sectionForecast')}</h2>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--G5)]">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--G3)] uppercase">{t('colPeriod')}</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-[var(--G3)] uppercase">{t('colCHG')}</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-[var(--G3)] uppercase">{t('colSAH')}</th>
                    <th className="text-right py-2 text-xs font-semibold text-[var(--G3)] uppercase">{t('colCP')}</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p, i) => {
                    const chg = employee.chg[i] ?? 0;
                    const sah = employee.sah[i] ?? 0;
                    const cp = employee.cp[i] ?? 0;
                    return (
                      <tr key={p.label} className={`border-b border-[var(--G6)] ${i === 0 ? 'bg-[var(--G6)]' : ''}`}>
                        <td className={`py-2 pr-4 font-medium ${i === 0 ? 'text-[var(--P)]' : 'text-[var(--G1)]'}`}>
                          {p.label}
                          {i === 0 && <span className="ml-2 text-[10px] text-[var(--G3)]">actual</span>}
                        </td>
                        <td className="py-2 px-3 text-right text-[var(--G2)]">{chg}</td>
                        <td className="py-2 px-3 text-right text-[var(--G2)]">{sah}</td>
                        <td className={`py-2 text-right font-semibold ${cp >= 80 ? 'text-[var(--GR)]' : cp >= 50 ? 'text-[var(--YL)]' : 'text-[var(--RD)]'}`}>
                          {cp}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
