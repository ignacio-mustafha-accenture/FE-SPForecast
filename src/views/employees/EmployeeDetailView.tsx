'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

import { useForecastStore } from '@/src/store/StoreProvider';
import { getClientContainer } from '@/src/application/container';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Textarea } from '@/src/components/ui/Textarea';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { DatePicker } from '@/src/components/ui/DatePicker';
import { useToast } from '@/src/hooks/useToast';
import { formatPercent } from '@/src/lib/formatters';
import type { ChargeabilityBlock, ScenarioType } from '@/src/core/domain/chargeabilityBlock';
import { HttpChargeabilityBlockRepository } from '@/src/adapters/http/HttpChargeabilityBlockRepository';

const statusVariant = {
  green:      'green',
  yellow:     'yellow',
  red:        'red',
  unassigned: 'neutral',
  leave:      'neutral',
} as const;

const statusColor: Record<string, string> = {
  green:      'var(--GR)',
  yellow:     'var(--YL)',
  red:        'var(--RD)',
  unassigned: 'var(--G4)',
  leave:      'var(--G4)',
};

const statusBg: Record<string, string> = {
  green:      'rgba(34,197,94,0.07)',
  yellow:     'rgba(245,158,11,0.07)',
  red:        'rgba(239,68,68,0.07)',
  unassigned: 'rgba(100,116,139,0.05)',
  leave:      'rgba(100,116,139,0.05)',
};

const statusLabel: Record<string, string> = {
  green:      'En objetivo',
  yellow:     'En riesgo',
  red:        'Bajo objetivo',
  unassigned: 'Sin proyecto',
  leave:      'Baja',
};

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

const blockSchema = z
  .object({
    chargeability_pct: z.string().min(1, 'Requerido'),
    start_date: z.string().min(1, 'Requerido'),
    end_date: z.string().min(1, 'Requerido'),
    scenario_type: z.enum(['assumption', 'effective']),
  })
  .superRefine((data, ctx) => {
    const pct = Number(data.chargeability_pct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      ctx.addIssue({ path: ['chargeability_pct'], message: 'Debe ser entre 0 y 100', code: z.ZodIssueCode.custom });
    }
    if (data.start_date && data.end_date) {
      const diff = (new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / 86400000;
      if (diff < 0) ctx.addIssue({ path: ['end_date'], message: 'Fin debe ser ≥ inicio', code: z.ZodIssueCode.custom });
      if (diff > 14) ctx.addIssue({ path: ['end_date'], message: 'Máximo 14 días', code: z.ZodIssueCode.custom });
    }
  });

type BlockForm = z.infer<typeof blockSchema>;

const blockRepo = new HttpChargeabilityBlockRepository();

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--G5)] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--G3)] mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-[var(--G1)] truncate">{value ?? <span className="font-normal text-[var(--G4)]">—</span>}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2.5 border-b border-[var(--G6)] last:border-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--G3)] mb-0.5">{label}</p>
      <p className="text-sm text-[var(--G1)]">{value ?? <span className="text-[var(--G4)]">—</span>}</p>
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

  // Chargeability blocks state
  const [blocks, setBlocks] = useState<ChargeabilityBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [deletingBlockId, setDeletingBlockId] = useState<number | null>(null);

  const {
    register: registerBlock,
    handleSubmit: handleSubmitBlock,
    formState: { errors: blockErrors },
    reset: resetBlock,
    setValue: setBlockValue,
    watch: watchBlock,
  } = useForm<BlockForm>({
    resolver: zodResolver(blockSchema),
    defaultValues: { scenario_type: 'assumption' },
  });

  const fetchBlocks = useCallback(async () => {
    setBlocksLoading(true);
    try {
      const data = await blockRepo.list(eid);
      setBlocks(data);
    } catch {
      // silently ignore — employee may have no blocks yet
    } finally {
      setBlocksLoading(false);
    }
  }, [eid]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  async function onSaveBlock(data: BlockForm) {
    setSavingBlock(true);
    try {
      await blockRepo.create(eid, {
        start_date: data.start_date,
        end_date: data.end_date,
        chargeability_pct: Number(data.chargeability_pct),
        scenario_type: data.scenario_type,
      });
      toast.success('Bloque creado');
      resetBlock({ scenario_type: 'assumption' });
      setShowBlockForm(false);
      await fetchBlocks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear bloque');
    } finally {
      setSavingBlock(false);
    }
  }

  async function onDeleteBlock(blockId: number) {
    setDeletingBlockId(blockId);
    try {
      await blockRepo.delete(eid, blockId);
      toast.success('Bloque eliminado');
      await fetchBlocks();
    } catch {
      toast.error('Error al eliminar bloque');
    } finally {
      setDeletingBlockId(null);
    }
  }

  const employee = useForecastStore((s) =>
    s.appState?.employees.find((e) => e.id === eid) ?? null,
  );
  const periods = useForecastStore((s) => s.appState?.periods ?? null);
  const isLoading = useForecastStore((s) => s.isLoading);

  const { register, handleSubmit } = useForm<EditForm>({
    values: employee
      ? {
          client:           employee.client ?? '',
          offering:         employee.projectType ?? '',
          rollOn:           employee.rollOn ?? '',
          rollOff:          employee.rollOff ?? '',
          chargeabilityPct: employee.chargeabilityPercent > 0
            ? String(Math.round(employee.chargeabilityPercent * 100))
            : '',
          accountManager:   employee.manager ?? '',
          nextClient:       '',
          notes:            employee.notes,
        }
      : undefined,
  });

  async function onSave(data: EditForm) {
    if (!employee) return;
    setSaving(true);
    try {
      await getClientContainer().updateEmployee.execute(employee.id, {
        client:          data.client || null,
        offering:        data.offering || null,
        rollOn:          data.rollOn || null,
        rollOff:         data.rollOff || null,
        chargeabilityPct: data.chargeabilityPct ? Number(data.chargeabilityPct) : null,
        accountManager:  data.accountManager || null,
        nextClient:      data.nextClient || null,
        notes:           data.notes || null,
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
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-4 gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="text-sm text-[var(--P)] hover:underline"
        >
          {t('back')}
        </button>
        <p className="text-[var(--G3)] text-sm">Empleado no encontrado.</p>
      </div>
    );
  }

  const st = employee.chargeabilityStatus;
  const barColor = statusColor[st];

  return (
    <div className="space-y-4">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm text-[var(--G3)] hover:text-[var(--P)] transition-colors"
      >
        {t('back')}
      </button>

      {/* Hero header */}
      <div
        className="rounded-2xl border border-[var(--G5)] p-6"
        style={{
          background: statusBg[st],
          borderLeftWidth: 4,
          borderLeftColor: statusColor[st],
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Avatar + identity */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
              style={{ backgroundColor: statusColor[st] }}
            >
              {employee.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-bold text-[var(--BK)]">{employee.name}</h1>
                <Badge variant={statusVariant[st]}>{statusLabel[st]}</Badge>
                {employee.newJoiner && <Badge variant="blue">NJ</Badge>}
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--G3)] flex-wrap">
                <span>{employee.id}</span>
                <span>·</span>
                <span>{employee.country}</span>
                <span>·</span>
                <span>CL {employee.level}</span>
                {employee.client && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-[var(--G1)]">{employee.client}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Chargeability */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-4xl font-bold tabular-nums" style={{ color: barColor }}>
              {formatPercent(employee.chargeabilityPercent)}
            </span>
            <ProgressBar
              value={employee.chargeabilityPercent}
              max={1}
              color={barColor}
              className="w-36"
            />
            <span className="text-xs text-[var(--G3)]">
              {employee.availableHours}h disp. / {employee.totalHours}h totales
            </span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t('fieldManager')}  value={employee.manager} />
        <StatCard label={t('fieldRollOff')}  value={employee.rollOff} />
        <StatCard label={t('fieldFAD')}      value={employee.fad} />
        <StatCard
          label={t('fieldDays')}
          value={employee.daysToAvailable > 0 ? `${employee.daysToAvailable} días` : null}
        />
      </div>

      {/* Info + Edit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Información */}
        <div className="bg-white rounded-xl border border-[var(--G5)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--G5)] bg-[var(--G6)]">
            <h2 className="text-sm font-semibold text-[var(--G1)]">{t('sectionInfo')}</h2>
          </div>
          <div className="px-5 py-1 grid grid-cols-2 gap-x-6">
            <Field label={t('fieldEID')}      value={employee.id} />
            <Field label={t('fieldCL')}       value={`CL ${employee.level}`} />
            <Field label={t('fieldCountry')}  value={employee.country} />
            <Field label={t('fieldHireDate')} value={employee.hireDate} />
            <Field label={t('fieldRollOn')}   value={employee.rollOn} />
            <Field label={t('fieldRollOff')}  value={employee.rollOff} />
            <Field label={t('fieldFAD')}      value={employee.fad} />
            <Field
              label={t('fieldDays')}
              value={employee.daysToAvailable > 0 ? `${employee.daysToAvailable} días` : null}
            />
            <Field label={t('fieldNextPTO')}  value={employee.nextPTO} />
            <Field
              label={t('fieldPTOHours')}
              value={employee.nextPTOHours != null ? `${employee.nextPTOHours}h` : null}
            />
            <Field label={t('fieldOffering')} value={employee.projectType} />
            <Field
              label={t('fieldNJ')}
              value={employee.newJoiner ? <Badge variant="blue">New Joiner</Badge> : 'No'}
            />
          </div>
          {employee.notes && (
            <div className="px-5 py-3 border-t border-[var(--G6)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--G3)] mb-1">{t('fieldNotes')}</p>
              <p className="text-sm text-[var(--G1)] whitespace-pre-wrap">{employee.notes}</p>
            </div>
          )}
        </div>

        {/* Editar */}
        <div className="bg-white rounded-xl border border-[var(--G5)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--G5)] bg-[var(--G6)]">
            <h2 className="text-sm font-semibold text-[var(--G1)]">{t('sectionEdit')}</h2>
          </div>
          <form onSubmit={handleSubmit(onSave)} className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('fieldClient')}           placeholder="Google"       {...register('client')} />
              <Input label={t('fieldOffering')}         placeholder="CTO"          {...register('offering')} />
              <Input label={t('fieldRollOn')}           placeholder="DD/MM/YY"     {...register('rollOn')} />
              <Input label={t('fieldRollOff')}          placeholder="DD/MM/YY"     {...register('rollOff')} />
              <Input label={t('fieldChargeabilityPct')} type="number" min={0} max={100} {...register('chargeabilityPct')} />
              <Input label={t('fieldAccountManager')}   placeholder="smith.john"   {...register('accountManager')} />
            </div>
            <Input label={t('fieldNextClient')} placeholder="Próximo cliente" {...register('nextClient')} />
            <Textarea label={t('fieldNotes')} placeholder="Notas..." {...register('notes')} />
            <Button type="submit" loading={saving} className="w-full">
              {t('saveBtn')}
            </Button>
          </form>
        </div>
      </div>

      {/* Cargabilidad por período */}
      <div className="bg-white rounded-xl border border-[var(--G5)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--G5)] bg-[var(--G6)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--G1)]">Cargabilidad por período</h2>
          <button
            type="button"
            onClick={() => setShowBlockForm((v) => !v)}
            className="text-xs text-[var(--P)] hover:underline"
          >
            {showBlockForm ? 'Cancelar' : '+ Agregar bloque'}
          </button>
        </div>

        {/* Add block form */}
        {showBlockForm && (
          <form onSubmit={handleSubmitBlock(onSaveBlock)} className="px-5 py-4 border-b border-[var(--G5)] space-y-3 bg-[var(--G6)]">
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="Fecha inicio"
                value={watchBlock('start_date')}
                onChange={(v) => setBlockValue('start_date', v)}
                error={blockErrors.start_date?.message}
              />
              <DatePicker
                label="Fecha fin"
                value={watchBlock('end_date')}
                onChange={(v) => setBlockValue('end_date', v)}
                error={blockErrors.end_date?.message}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cargabilidad %"
                type="number"
                min={0}
                max={100}
                step={0.1}
                error={blockErrors.chargeability_pct?.message}
                {...registerBlock('chargeability_pct')}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--G2)]">Escenario</label>
                <div className="flex gap-2">
                  {([
                    { value: 'assumption', label: 'Asunción' },
                    { value: 'effective', label: 'Efectivo' },
                  ] as { value: ScenarioType; label: string }[]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBlockValue('scenario_type', opt.value)}
                      className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                        (watchBlock('scenario_type') ?? 'assumption') === opt.value
                          ? 'border-[var(--P)] bg-white text-[var(--P)] font-medium'
                          : 'border-[var(--G5)] bg-white text-[var(--G2)] hover:bg-[var(--G6)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Button type="submit" loading={savingBlock} className="w-full">
              Guardar bloque
            </Button>
          </form>
        )}

        {/* Blocks list */}
        {blocksLoading ? (
          <div className="px-5 py-4 space-y-2">
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
          </div>
        ) : blocks.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--G4)]">Sin bloques registrados.</p>
        ) : (
          <div className="divide-y divide-[var(--G6)]">
            {blocks.map((b) => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-[var(--G1)]">
                  <Badge variant={b.scenarioType === 'effective' ? 'blue' : 'neutral'}>
                    {b.scenarioType === 'effective' ? 'Efectivo' : 'Asunción'}
                  </Badge>
                  <span className="font-semibold">{b.chargeabilityPct}%</span>
                  <span className="text-[var(--G3)]">{b.startDate} → {b.endDate}</span>
                  {b.periodName && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--G3)] bg-[var(--G5)] px-1.5 py-0.5 rounded">
                      {b.periodName}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={deletingBlockId === b.id}
                  onClick={() => onDeleteBlock(b.id)}
                  className="text-xs text-[var(--RD)] hover:underline disabled:opacity-40"
                >
                  {deletingBlockId === b.id ? '…' : 'Eliminar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Forecast histórico */}
      {(periods ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--G5)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--G5)] bg-[var(--G6)]">
            <h2 className="text-sm font-semibold text-[var(--G1)]">{t('sectionForecast')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--G5)]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--G3)] uppercase tracking-wide">{t('colPeriod')}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--G3)] uppercase tracking-wide">{t('colCHG')}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--G3)] uppercase tracking-wide">{t('colSAH')}</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--G3)] uppercase tracking-wide w-52">{t('colCP')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--G6)]">
                {(periods ?? []).map((p, i) => {
                  const chg = employee.chg[i] ?? 0;
                  const sah = employee.sah[i] ?? 0;
                  const cp  = employee.cp[i]  ?? 0;
                  const cpColor = cp >= 80 ? 'var(--GR)' : cp >= 50 ? 'var(--YL)' : 'var(--RD)';
                  return (
                    <tr
                      key={p.label}
                      className={i === 0 ? 'bg-[var(--G6)]' : 'hover:bg-[var(--G6)] transition-colors'}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${i === 0 ? 'text-[var(--P)]' : 'text-[var(--G1)]'}`}>
                            {p.label}
                          </span>
                          {i === 0 && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--G3)] bg-[var(--G5)] px-1.5 py-0.5 rounded">
                              actual
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-[var(--G2)]">{chg}</td>
                      <td className="px-5 py-3 text-right text-[var(--G2)]">{sah}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <ProgressBar value={cp} max={100} color={cpColor} className="w-24" />
                          <span className="font-semibold w-10 text-right tabular-nums" style={{ color: cpColor }}>
                            {cp}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
