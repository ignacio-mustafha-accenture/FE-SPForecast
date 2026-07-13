'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

import type { Ticket } from '@/src/core/domain/ticket';
import { getClientContainer } from '@/src/application/container';
import { Modal } from '@/src/components/ui/Modal';
import { Input } from '@/src/components/ui/Input';
import { Textarea } from '@/src/components/ui/Textarea';
import { Button } from '@/src/components/ui/Button';
import { useToast } from '@/src/hooks/useToast';
import { useForecastStore } from '@/src/store/StoreProvider';
import { X, ChevronDown } from 'lucide-react';

type FormData = {
  eid: string;
  type: 'newproj' | 'ongoing' | 'pto' | 'sick' | 'nj' | 'baja';
  detail?: string;
  client_name?: string;
  chargeability_pct: string;
  hours_to_move: string;
  from_period: string;
  to_period: string;
  comments?: string;
};

interface TicketPanelProps {
  open: boolean;
  ticket: Ticket | null;
  onClose: () => void;
}

function useDropdownNav(listRef: React.RefObject<HTMLUListElement | null>, count: number, open: boolean) {
  const [idx, setIdx] = useState(-1);
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

export function TicketPanel({ open, ticket, onClose }: TicketPanelProps) {
  const t = useTranslations('ticketPanel');
  const tTickets = useTranslations('tickets');
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [eidSearch, setEidSearch] = useState('');
  const [showEidDrop, setShowEidDrop] = useState(false);
  const [showTypeDrop, setShowTypeDrop] = useState(false);

  const eidListRef = useRef<HTMLUListElement>(null);
  const typeListRef = useRef<HTMLUListElement>(null);
  const clientListRef = useRef<HTMLUListElement>(null);

  const employees = useForecastStore((s) => s.appState?.employees ?? []);

  useEffect(() => {
    fetch('/api/admin/clients', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : { clients: [] })
      .then((d) => setClients(d.clients ?? []))
      .catch(() => {});
  }, []);

  const schema = z.object({
    eid: z.string().min(1, t('required')),
    type: z.enum(['newproj', 'ongoing', 'pto', 'sick', 'nj', 'baja']),
    detail: z.string().optional(),
    client_name: z.string().optional(),
    chargeability_pct: z.string().min(1, t('required')),
    hours_to_move: z.string().min(1, t('required')),
    from_period: z.string().min(1, t('required')),
    to_period: z.string().min(1, t('required')),
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
    setValue,
    watch,
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

  const selectedClient = watch('client_name') ?? '';
  const filteredClients = clients.filter(
    (c) => c.toLowerCase().includes(clientSearch.toLowerCase()) && c !== selectedClient,
  );
  const hasCustomClient = clientSearch.length > 0 && !clients.includes(clientSearch);
  const clientNavItems = [...filteredClients, ...(hasCustomClient ? [clientSearch] : [])];

  const selectedEid = watch('eid') ?? '';
  const selectedEmployee = employees.find((e) => e.id === selectedEid);
  const filteredEmployees = employees.filter(
    (e) =>
      (e.id.toLowerCase().includes(eidSearch.toLowerCase()) ||
        e.name.toLowerCase().includes(eidSearch.toLowerCase())) &&
      e.id !== selectedEid,
  );

  const eidNav = useDropdownNav(eidListRef, filteredEmployees.length, showEidDrop);
  const typeNav = useDropdownNav(typeListRef, TYPE_OPTIONS.length, showTypeDrop);
  const clientNav = useDropdownNav(clientListRef, clientNavItems.length, showClientDrop);

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
    <Modal open={open} onClose={onClose} title={ticket ? t('editTitle') : t('createTitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* EID */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--G2)]">{t('eidLabel')}</label>
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2 border border-[var(--G5)] rounded-lg bg-white focus-within:border-[var(--P)] transition-colors cursor-text">
                {selectedEid && !ticket ? (
                  <>
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[var(--P)] text-white rounded-full text-sm shrink-0 max-w-[160px] truncate">
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
                ) : ticket ? (
                  <span className="flex-1 text-sm text-[var(--G3)]">{selectedEid}</span>
                ) : (
                  <input
                    type="text"
                    placeholder={t('eidPlaceholder')}
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

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--G2)]">{t('typeLabel')}</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTypeDrop((v) => !v)}
                onBlur={() => setTimeout(() => setShowTypeDrop(false), 150)}
                onKeyDown={(e) => typeNav.onKey(e,
                  (i) => { setValue('type', TYPE_OPTIONS[i].value as FormData['type']); setShowTypeDrop(false); },
                  () => setShowTypeDrop(false),
                )}
                className="flex items-center gap-2 w-full px-3 py-2 border border-[var(--G5)] rounded-lg bg-white text-sm text-left focus:outline-none focus:border-[var(--P)] transition-colors"
              >
                <span className={`flex-1 ${watch('type') ? 'text-[var(--G1)]' : 'text-[var(--G4)]'}`}>
                  {TYPE_OPTIONS.find((o) => o.value === watch('type'))?.label ?? t('typeLabel')}
                </span>
                <ChevronDown size={14} className="text-[var(--G3)] shrink-0" />
              </button>
              {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type.message}</p>}
              {showTypeDrop && (
                <ul ref={typeListRef} className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden">
                  {TYPE_OPTIONS.map((o, i) => (
                    <li
                      key={o.value}
                      onMouseDown={() => { setValue('type', o.value as FormData['type']); setShowTypeDrop(false); }}
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                        i === typeNav.idx
                          ? 'bg-[var(--G6)]'
                          : watch('type') === o.value
                            ? 'bg-[var(--PB)] text-[var(--P)] font-medium'
                            : 'text-[var(--G1)] hover:bg-[var(--G6)]'
                      }`}
                    >
                      {o.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Client */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--G2)]">{t('clientLabel')}</label>
          <div className="relative">
            <div
              className="flex items-center gap-2 px-3 py-2 border border-[var(--G5)] rounded-lg bg-white focus-within:border-[var(--P)] transition-colors cursor-text"
              onClick={() => !selectedClient && setShowClientDrop(true)}
            >
              {selectedClient ? (
                <>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[var(--P)] text-white rounded-full text-sm shrink-0">
                    {selectedClient}
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setValue('client_name', ''); setClientSearch(''); }}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </span>
                  <span className="flex-1" />
                </>
              ) : (
                <input
                  type="text"
                  placeholder={t('clientPlaceholder')}
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setShowClientDrop(true); }}
                  onFocus={() => setShowClientDrop(true)}
                  onBlur={() => setTimeout(() => setShowClientDrop(false), 150)}
                  onKeyDown={(e) => clientNav.onKey(e,
                    (i) => { setValue('client_name', clientNavItems[i]); setClientSearch(''); setShowClientDrop(false); },
                    () => setShowClientDrop(false),
                  )}
                  className="flex-1 text-sm text-[var(--G1)] outline-none bg-transparent placeholder:text-[var(--G4)]"
                />
              )}
              <ChevronDown size={14} className="text-[var(--G3)] shrink-0" />
            </div>
            {showClientDrop && (filteredClients.length > 0 || clientSearch) && (
              <ul ref={clientListRef} className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--G5)] [&::-webkit-scrollbar-thumb]:rounded-full">
                {filteredClients.map((c, i) => (
                  <li
                    key={c}
                    onMouseDown={() => { setValue('client_name', c); setClientSearch(''); setShowClientDrop(false); }}
                    className={`px-3 py-2 text-sm cursor-pointer transition-colors ${i === clientNav.idx ? 'bg-[var(--G6)]' : 'text-[var(--G1)] hover:bg-[var(--G6)]'}`}
                  >
                    {c}
                  </li>
                ))}
                {hasCustomClient && (
                  <li
                    onMouseDown={() => { setValue('client_name', clientSearch); setClientSearch(''); setShowClientDrop(false); }}
                    className={`px-3 py-2 text-sm cursor-pointer border-t border-[var(--G6)] transition-colors ${filteredClients.length === clientNav.idx ? 'bg-[var(--G6)]' : 'text-[var(--P)] hover:bg-[var(--PB)]'}`}
                  >
                    + Usar &quot;{clientSearch}&quot;
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label={t('chargeabilityLabel')} type="number" min={0} max={100} error={errors.chargeability_pct?.message} {...register('chargeability_pct')} />
          <Input label={t('hoursLabel')} type="number" min={0} error={errors.hours_to_move?.message} {...register('hours_to_move')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('fromPeriodLabel')} placeholder={t('fromPeriodPlaceholder')} error={errors.from_period?.message} {...register('from_period')} />
          <Input label={t('toPeriodLabel')} placeholder={t('toPeriodPlaceholder')} error={errors.to_period?.message} {...register('to_period')} />
        </div>
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
    </Modal>
  );
}
