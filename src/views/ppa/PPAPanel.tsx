'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { X, ChevronDown } from 'lucide-react';

import { getClientContainer } from '@/src/application/container';
import { useForecastStore } from '@/src/store/StoreProvider';
import { Modal } from '@/src/components/ui/Modal';
import { Input } from '@/src/components/ui/Input';
import { Textarea } from '@/src/components/ui/Textarea';
import { Button } from '@/src/components/ui/Button';
import { useToast } from '@/src/hooks/useToast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ALL_PERIODS = MONTHS.flatMap((m) => [`${m}-P1`, `${m}-P2`]);

function currentPeriodIndex(): number {
  const now = new Date();
  return now.getMonth() * 2 + (now.getDate() <= 15 ? 0 : 1);
}

const AVAILABLE_PERIODS = ALL_PERIODS.slice(currentPeriodIndex());

type PPAFormData = {
  eid: string;
  fromPeriod: string;
  toPeriod: string;
  hours: string;
  reason: string;
};

interface PPAPanelProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function useDropdownNav(listRef: React.RefObject<HTMLUListElement | null>, count: number, open: boolean) {
  const [idx, setIdx] = useState(-1);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setIdx(-1); }, [open]);
  useEffect(() => {
    if (idx < 0 || !listRef.current) return;
    (listRef.current.children[idx] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
  }, [idx, listRef]);
  function onKey(e: React.KeyboardEvent, onSelect: (i: number) => void, onClose: () => void) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, count - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); onSelect(idx); setIdx(-1); }
    else if (e.key === 'Escape') { onClose(); }
  }
  return { idx, onKey };
}

export function PPAPanel({ open, onClose, onCreated }: PPAPanelProps) {
  const t = useTranslations('ppa');
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [eidSearch, setEidSearch] = useState('');
  const [showEidDrop, setShowEidDrop] = useState(false);
  const [showFromDrop, setShowFromDrop] = useState(false);
  const [showToDrop, setShowToDrop] = useState(false);

  const eidListRef = useRef<HTMLUListElement>(null);
  const fromListRef = useRef<HTMLUListElement>(null);
  const toListRef = useRef<HTMLUListElement>(null);

  const employees = useForecastStore((s) => s.appState?.employees ?? null);

  const schema = z.object({
    eid: z.string().min(1, t('required')),
    fromPeriod: z.string().min(1, t('required')),
    toPeriod: z.string().min(1, t('required')),
    hours: z.string().min(1, t('required')),
    reason: z.string().optional(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PPAFormData>({
    resolver: zodResolver(schema) as Resolver<PPAFormData>,
  });

  const selectedEid = watch('eid') ?? '';
  const selectedEmployee = (employees ?? []).find((e) => e.id === selectedEid);
  const filteredEmployees = (employees ?? []).filter(
    (e) =>
      (e.id.toLowerCase().includes(eidSearch.toLowerCase()) ||
        e.name.toLowerCase().includes(eidSearch.toLowerCase())) &&
      e.id !== selectedEid,
  );

  const selectedFrom = watch('fromPeriod') ?? '';
  const selectedTo = watch('toPeriod') ?? '';

  const eidNav = useDropdownNav(eidListRef, filteredEmployees.length, showEidDrop);
  const fromNav = useDropdownNav(fromListRef, AVAILABLE_PERIODS.length, showFromDrop);
  const toNav = useDropdownNav(toListRef, AVAILABLE_PERIODS.length, showToDrop);

  function handleClose() {
    reset();
    setEidSearch('');
    onClose();
  }

  async function onSubmit(data: PPAFormData) {
    setSaving(true);
    try {
      await getClientContainer().applyPPA.execute({
        eid: data.eid,
        fromPeriod: data.fromPeriod,
        toPeriod: data.toPeriod,
        hours: Number(data.hours),
        reason: data.reason ?? '',
      });
      toast.success(t('toastCreated'));
      reset();
      setEidSearch('');
      onCreated();
    } catch {
      toast.error(t('toastError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('drawerTitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* EID */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--G2)]">{t('fieldEmployee')}</label>
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 border border-[var(--G5)] rounded-lg bg-white focus-within:border-[var(--P)] transition-colors cursor-text">
              {selectedEid ? (
                <>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[var(--P)] text-white rounded-full text-sm shrink-0 max-w-[200px] truncate">
                    {selectedEmployee ? selectedEmployee.name : selectedEid}
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setValue('eid', ''); setEidSearch(''); }}
                      className="hover:opacity-70 transition-opacity shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </span>
                  <span className="flex-1" />
                </>
              ) : (
                <input
                  type="text"
                  placeholder={t('fieldEmployeePlaceholder')}
                  value={eidSearch}
                  onChange={(e) => { setEidSearch(e.target.value); setShowEidDrop(true); }}
                  onFocus={() => setShowEidDrop(true)}
                  onBlur={() => setTimeout(() => setShowEidDrop(false), 150)}
                  onKeyDown={(e) => eidNav.onKey(e,
                    (i) => { setValue('eid', filteredEmployees[i].id); setEidSearch(''); setShowEidDrop(false); },
                    () => setShowEidDrop(false),
                  )}
                  className="flex-1 text-sm text-[var(--G1)] outline-none bg-transparent placeholder:text-[var(--G4)]"
                />
              )}
              <ChevronDown size={14} className="text-[var(--G3)] shrink-0" />
            </div>
            {errors.eid && <p className="text-xs text-red-500 mt-1">{errors.eid.message}</p>}

            {showEidDrop && filteredEmployees.length > 0 && (
              <ul ref={eidListRef} className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--G5)] [&::-webkit-scrollbar-thumb]:rounded-full">
                {filteredEmployees.map((e, i) => (
                  <li
                    key={e.id}
                    onMouseDown={() => { setValue('eid', e.id); setEidSearch(''); setShowEidDrop(false); }}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${i === eidNav.idx ? 'bg-[var(--G6)]' : 'hover:bg-[var(--G6)]'}`}
                  >
                    <span className="text-sm text-[var(--G1)] font-medium">{e.name}</span>
                    <span className="text-xs text-[var(--G3)]">{e.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Periods */}
        <div className="grid grid-cols-2 gap-4">
          {/* From Period */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--G2)]">{t('fieldFrom')}</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowFromDrop((v) => !v); setShowToDrop(false); }}
                onBlur={() => setTimeout(() => setShowFromDrop(false), 150)}
                onKeyDown={(e) => fromNav.onKey(e,
                  (i) => { setValue('fromPeriod', AVAILABLE_PERIODS[i]); setShowFromDrop(false); },
                  () => setShowFromDrop(false),
                )}
                className="flex items-center gap-2 w-full px-3 py-2 border border-[var(--G5)] rounded-lg bg-white text-sm text-left focus:outline-none focus:border-[var(--P)] transition-colors"
              >
                <span className={`flex-1 ${selectedFrom ? 'text-[var(--G1)]' : 'text-[var(--G4)]'}`}>
                  {selectedFrom || t('fieldFrom')}
                </span>
                <ChevronDown size={14} className="text-[var(--G3)] shrink-0" />
              </button>
              {errors.fromPeriod && <p className="text-xs text-red-500 mt-1">{errors.fromPeriod.message}</p>}
              {showFromDrop && (
                <ul ref={fromListRef} className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--G5)] [&::-webkit-scrollbar-thumb]:rounded-full">
                  {AVAILABLE_PERIODS.map((p, i) => (
                    <li
                      key={p}
                      onMouseDown={() => { setValue('fromPeriod', p); setShowFromDrop(false); }}
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                        i === fromNav.idx
                          ? 'bg-[var(--G6)]'
                          : selectedFrom === p
                            ? 'bg-[var(--PB)] text-[var(--P)] font-medium'
                            : 'text-[var(--G1)] hover:bg-[var(--G6)]'
                      }`}
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* To Period */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--G2)]">{t('fieldTo')}</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowToDrop((v) => !v); setShowFromDrop(false); }}
                onBlur={() => setTimeout(() => setShowToDrop(false), 150)}
                onKeyDown={(e) => toNav.onKey(e,
                  (i) => { setValue('toPeriod', AVAILABLE_PERIODS[i]); setShowToDrop(false); },
                  () => setShowToDrop(false),
                )}
                className="flex items-center gap-2 w-full px-3 py-2 border border-[var(--G5)] rounded-lg bg-white text-sm text-left focus:outline-none focus:border-[var(--P)] transition-colors"
              >
                <span className={`flex-1 ${selectedTo ? 'text-[var(--G1)]' : 'text-[var(--G4)]'}`}>
                  {selectedTo || t('fieldTo')}
                </span>
                <ChevronDown size={14} className="text-[var(--G3)] shrink-0" />
              </button>
              {errors.toPeriod && <p className="text-xs text-red-500 mt-1">{errors.toPeriod.message}</p>}
              {showToDrop && (
                <ul ref={toListRef} className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--G5)] [&::-webkit-scrollbar-thumb]:rounded-full">
                  {AVAILABLE_PERIODS.map((p, i) => (
                    <li
                      key={p}
                      onMouseDown={() => { setValue('toPeriod', p); setShowToDrop(false); }}
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                        i === toNav.idx
                          ? 'bg-[var(--G6)]'
                          : selectedTo === p
                            ? 'bg-[var(--PB)] text-[var(--P)] font-medium'
                            : 'text-[var(--G1)] hover:bg-[var(--G6)]'
                      }`}
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Hours */}
        <Input
          label={t('fieldHours')}
          type="number"
          min={1}
          error={errors.hours?.message}
          {...register('hours')}
        />

        {/* Reason */}
        <Textarea
          label={t('fieldReason')}
          placeholder={t('fieldReasonPlaceholder')}
          {...register('reason')}
        />

        <div className="flex gap-2 pt-2">
          <Button type="submit" loading={saving} className="flex-1">
            {t('submitCreate')}
          </Button>
          <Button type="button" variant="ghost" onClick={handleClose}>
            {t('cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
