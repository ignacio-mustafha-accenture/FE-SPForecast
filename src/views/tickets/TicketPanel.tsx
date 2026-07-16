'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

import type { Ticket, CreateTicketPayload, UpdateTicketPayload } from '@/src/core/domain/ticket';
import { getClientContainer } from '@/src/application/container';
import { Modal } from '@/src/components/ui/Modal';
import { Input } from '@/src/components/ui/Input';
import { DatePicker } from '@/src/components/ui/DatePicker';
import { Textarea } from '@/src/components/ui/Textarea';
import { Button } from '@/src/components/ui/Button';
import { useToast } from '@/src/hooks/useToast';
import { useForecastStore } from '@/src/store/StoreProvider';
import { X, ChevronDown } from 'lucide-react';

type TicketType = 'newproj' | 'ongoing' | 'pto' | 'sick' | 'nj' | 'baja';

type ScenarioType = 'assumption' | 'effective';

type FormData = {
  type: TicketType;
  eid?: string;
  client_name?: string;
  offering_type?: string;
  chargeability_pct?: string;
  start_date?: string;
  end_date?: string;
  nj_name?: string;
  cl?: string;
  location?: string;
  people_lead?: string;
  eid_accenture?: string;
  hours_to_move?: string;
  comments?: string;
  scenario_type?: ScenarioType;
};

interface TicketPanelProps {
  open: boolean;
  ticket: Ticket | null;
  onClose: () => void;
  onSuccess?: () => void;
}


function useDropdownNav(
  listRef: React.RefObject<HTMLUListElement | null>,
  count: number,
  open: boolean,
) {
  const [idx, setIdx] = useState(-1);
  useEffect(() => {
    setIdx(-1);
  }, [open]);
  useEffect(() => {
    if (idx < 0 || !listRef.current) return;
    (listRef.current.children[idx] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
  }, [idx, listRef]);
  function onKey(
    e: React.KeyboardEvent,
    onSelect: (i: number) => void,
    onClose: () => void,
  ) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, count - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && idx >= 0) {
      e.preventDefault();
      onSelect(idx);
      setIdx(-1);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }
  return { idx, onKey };
}

const CL_OPTIONS = ['8', '9', '10', '11', '12', '13'].map((v) => ({ value: v, label: v }));
const LOCATION_OPTIONS = [
  { value: 'AR', label: 'Argentina' },
  { value: 'MX', label: 'Mexico' },
  { value: 'CR', label: 'Costa Rica' },
];
const OFFERING_OPTIONS = [
  { value: 'Tech-led', label: 'Tech-led' },
  { value: 'Cost Take Out', label: 'Cost Take Out' },
  { value: 'OM+SPY+Others', label: 'OM+SPY+Others' },
  { value: 'Internal', label: 'Internal' },
  { value: 'CTO', label: 'CTO' },
];

function generateEidFromName(name: string): string {
  return name
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (á→a, ñ→n, etc.)
    .toLowerCase()
    .replace(/\s+/g, '.'); // spaces → dots
}

export function TicketPanel({ open, ticket, onClose, onSuccess }: TicketPanelProps) {
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
  const [showOfferingDrop, setShowOfferingDrop] = useState(false);
  const [showClDrop, setShowClDrop] = useState(false);
  const [showLocationDrop, setShowLocationDrop] = useState(false);

  const eidListRef = useRef<HTMLUListElement>(null);
  const typeListRef = useRef<HTMLUListElement>(null);
  const clientListRef = useRef<HTMLUListElement>(null);
  const offeringListRef = useRef<HTMLUListElement>(null);
  const clListRef = useRef<HTMLUListElement>(null);
  const locationListRef = useRef<HTMLUListElement>(null);
  const prevAutoEidRef = useRef('');

  const employees = useForecastStore((s) => s.appState?.employees ?? null);

  useEffect(() => {
    fetch('/api/admin/clients', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { clients: [] }))
      .then((d) => setClients(d.clients ?? []))
      .catch(() => {});
  }, []);

  const schema = z
    .object({
      type: z.enum(['newproj', 'ongoing', 'pto', 'sick', 'nj', 'baja']),
      eid: z.string().optional(),
      client_name: z.string().optional(),
      offering_type: z.string().optional(),
      chargeability_pct: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      nj_name: z.string().optional(),
      cl: z.string().optional(),
      location: z.string().optional(),
      people_lead: z.string().optional(),
      eid_accenture: z.string().optional(),
      hours_to_move: z.string().optional(),
      comments: z.string().optional(),
      scenario_type: z.enum(['assumption', 'effective']).optional(),
    })
    .superRefine((data, ctx) => {
      const req = (field: string, msg: string) => {
        if (!data[field as keyof typeof data]) {
          ctx.addIssue({ path: [field], message: msg, code: z.ZodIssueCode.custom });
        }
      };
      if (data.type !== 'nj') req('eid', t('required'));
      if (data.type === 'newproj') {
        req('client_name', t('required'));
        req('offering_type', t('required'));
        req('chargeability_pct', t('required'));
        req('start_date', t('required'));
        req('end_date', t('required'));
      }
      if (data.type === 'ongoing') {
        req('chargeability_pct', t('required'));
        req('end_date', t('required'));
      }
      if (data.type === 'pto' || data.type === 'sick') {
        req('start_date', t('required'));
        req('end_date', t('required'));
      }
      if (data.type === 'baja') req('end_date', t('required'));
      if (data.chargeability_pct) {
        const num = Number(data.chargeability_pct);
        const decimalDigits = data.chargeability_pct.split('.')[1]?.length ?? 0;
        if (isNaN(num) || num < 0 || num > 100 || decimalDigits > 1) {
          ctx.addIssue({ path: ['chargeability_pct'], message: t('chargeabilityInvalid'), code: z.ZodIssueCode.custom });
        }
      }
      if (data.type === 'nj') {
        req('nj_name', t('required'));
        req('start_date', t('required'));
        req('cl', t('required'));
        req('location', t('required'));
        req('people_lead', t('required'));
      }
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
    getValues,
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    values: ticket
      ? {
          type: ticket.type,
          eid: ticket.employeeId,
          client_name: ticket.clientName ?? '',
          offering_type: ticket.offeringType ?? '',
          chargeability_pct:
            ticket.chargeabilityPct != null ? String(ticket.chargeabilityPct) : '',
          start_date: ticket.startDate ?? '',
          end_date: ticket.endDate ?? '',
          nj_name: ticket.njName ?? '',
          cl: ticket.cl ?? '',
          location: ticket.location ?? '',
          people_lead: ticket.peopleLead ?? '',
          eid_accenture: '',
          comments: ticket.comments ?? '',
          scenario_type: ticket.scenarioType ?? 'assumption',
        }
      : undefined,
  });

  const selectedType = watch('type');

  // Reset form fields when type changes (create mode only)
  useEffect(() => {
    if (!ticket) {
      reset({ type: selectedType, ...(selectedType === 'sick' ? { hours_to_move: '8' } : {}) });
      setEidSearch('');
      setClientSearch('');
      setShowEidDrop(false);
      setShowClientDrop(false);
      setShowOfferingDrop(false);
      setShowClDrop(false);
      setShowLocationDrop(false);
      prevAutoEidRef.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  // Auto-generate eid_accenture from nj_name while user hasn't manually edited the field
  const njName = watch('nj_name') ?? '';
  useEffect(() => {
    if (!njName) return;
    const currentEid = getValues('eid_accenture') ?? '';
    // Only auto-fill if the field is empty or still matches the last auto-generated value
    if (currentEid !== '' && currentEid !== prevAutoEidRef.current) return;
    const generated = generateEidFromName(njName);
    prevAutoEidRef.current = generated;
    setValue('eid_accenture', generated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [njName]);

  const selectedClient = watch('client_name') ?? '';
  const filteredClients = clients.filter(
    (c) => c.toLowerCase().includes(clientSearch.toLowerCase()) && c !== selectedClient,
  );
  const hasCustomClient = clientSearch.length > 0 && !clients.includes(clientSearch);
  const clientNavItems = [...filteredClients, ...(hasCustomClient ? [clientSearch] : [])];

  const selectedEid = watch('eid') ?? '';
  const selectedEmployee = (employees ?? []).find((e) => e.id === selectedEid);


  const filteredEmployees = (employees ?? []).filter(
    (e) =>
      (e.id.toLowerCase().includes(eidSearch.toLowerCase()) ||
        e.name.toLowerCase().includes(eidSearch.toLowerCase())) &&
      e.id !== selectedEid,
  );

  const eidNav = useDropdownNav(eidListRef, filteredEmployees.length, showEidDrop);
  const typeNav = useDropdownNav(typeListRef, TYPE_OPTIONS.length, showTypeDrop);
  const clientNav = useDropdownNav(clientListRef, clientNavItems.length, showClientDrop);
  const offeringNav = useDropdownNav(offeringListRef, OFFERING_OPTIONS.length, showOfferingDrop);
  const clNav = useDropdownNav(clListRef, CL_OPTIONS.length, showClDrop);
  const locationNav = useDropdownNav(locationListRef, LOCATION_OPTIONS.length, showLocationDrop);

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const container = getClientContainer();
      if (ticket) {
        const updatePayload: UpdateTicketPayload = {
          comments: data.comments || undefined,
        };
        if (data.type === 'newproj') {
          updatePayload.client_name = data.client_name;
          updatePayload.offering_type = data.offering_type;
          updatePayload.chargeability_pct = data.chargeability_pct
            ? Number(data.chargeability_pct)
            : undefined;
          updatePayload.start_date = data.start_date;
          updatePayload.end_date = data.end_date;
        } else if (data.type === 'ongoing') {
          updatePayload.chargeability_pct = data.chargeability_pct
            ? Number(data.chargeability_pct)
            : undefined;
          updatePayload.end_date = data.end_date;
        } else if (data.type === 'pto' || data.type === 'sick') {
          updatePayload.start_date = data.start_date;
          updatePayload.end_date = data.end_date;
        } else if (data.type === 'baja') {
          updatePayload.end_date = data.end_date;
        }
        await container.updateTicket.execute(ticket.id, updatePayload);
        toast.success(t('toastUpdated'));
        onSuccess?.();
      } else {
        const createPayload: CreateTicketPayload = {
          type: data.type,
          comments: data.comments || undefined,
        };
        if (data.type !== 'nj') createPayload.eid = data.eid;
        if (data.type === 'newproj') {
          createPayload.client_name = data.client_name;
          createPayload.offering_type = data.offering_type;
          createPayload.chargeability_pct = data.chargeability_pct
            ? Number(data.chargeability_pct)
            : undefined;
          createPayload.start_date = data.start_date;
          createPayload.end_date = data.end_date;
          createPayload.scenario_type = data.scenario_type ?? 'assumption';
        } else if (data.type === 'ongoing') {
          createPayload.chargeability_pct = data.chargeability_pct
            ? Number(data.chargeability_pct)
            : undefined;
          createPayload.end_date = data.end_date;
          createPayload.scenario_type = data.scenario_type ?? 'assumption';
        } else if (data.type === 'pto' || data.type === 'sick') {
          createPayload.start_date = data.start_date;
          createPayload.end_date = data.end_date;
          if (data.type === 'sick' && data.hours_to_move) {
            createPayload.hours_to_move = Number(data.hours_to_move);
          }
        } else if (data.type === 'baja') {
          createPayload.end_date = data.end_date;
        } else if (data.type === 'nj') {
          createPayload.nj_name = data.nj_name;
          createPayload.start_date = data.start_date;
          createPayload.cl = data.cl ? Number(data.cl) : undefined;
          createPayload.location = data.location;
          createPayload.people_lead = data.people_lead;
          if (data.eid_accenture) createPayload.eid_accenture = data.eid_accenture;
        }
        await container.createTicket.execute(createPayload);
        toast.success(t('toastCreated'));
        onSuccess?.();
      }
      reset();
      onClose();
    } catch (err) {
      console.error('[TicketPanel] submit error:', err);
      toast.error(t('toastError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={ticket ? t('editTitle') : t('createTitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Type selector — always visible */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--G2)]">{t('typeLabel')}</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTypeDrop((v) => !v)}
              onBlur={() => setTimeout(() => setShowTypeDrop(false), 150)}
              onKeyDown={(e) =>
                typeNav.onKey(
                  e,
                  (i) => {
                    setValue('type', TYPE_OPTIONS[i].value as TicketType);
                    setShowTypeDrop(false);
                  },
                  () => setShowTypeDrop(false),
                )
              }
              className={`flex items-center gap-2 w-full px-3 py-2 border rounded-lg bg-white text-sm text-left focus:outline-none transition-colors ${showTypeDrop ? 'border-[var(--P)] ring-1 ring-[var(--P)]' : 'border-[var(--G5)]'}`}
            >
              <span className={`flex-1 ${watch('type') ? 'text-[var(--G1)]' : 'text-[var(--G4)]'}`}>
                {TYPE_OPTIONS.find((o) => o.value === watch('type'))?.label ?? t('typeLabel')}
              </span>
              <ChevronDown size={14} className="text-[var(--G3)] shrink-0" />
            </button>
            {errors.type && <p className="text-xs text-[var(--RD)] mt-1">{errors.type.message}</p>}
            {showTypeDrop && (
              <ul
                ref={typeListRef}
                className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden"
              >
                {TYPE_OPTIONS.map((o, i) => (
                  <li
                    key={o.value}
                    onMouseDown={() => {
                      setValue('type', o.value as TicketType);
                      setShowTypeDrop(false);
                    }}
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

        {/* Type-specific fields with enter/exit animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedType ?? 'none'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            {/* EID — all types except nj */}
            {selectedType !== 'nj' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--G2)]">{t('eidLabel')}</label>
                <div className="relative">
                  <div className="flex items-center gap-2 px-3 py-2 border border-[var(--G5)] rounded-lg bg-white focus-within:border-[var(--P)] transition-colors cursor-text">
                    {selectedEid && !ticket ? (
                      <>
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[var(--P)] text-white rounded-full text-sm min-w-0 max-w-[160px]">
                          <span className="truncate">{selectedEmployee ? selectedEmployee.name : selectedEid}</span>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setValue('eid', '');
                              setEidSearch('');
                            }}
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
                        onChange={(e) => {
                          setEidSearch(e.target.value);
                          setShowEidDrop(true);
                        }}
                        onFocus={() => setShowEidDrop(true)}
                        onBlur={() => setTimeout(() => setShowEidDrop(false), 150)}
                        onKeyDown={(e) =>
                          eidNav.onKey(
                            e,
                            (i) => {
                              setValue('eid', filteredEmployees[i].id);
                              setEidSearch('');
                              setShowEidDrop(false);
                            },
                            () => setShowEidDrop(false),
                          )
                        }
                        className="flex-1 text-sm text-[var(--G1)] outline-none bg-transparent placeholder:text-[var(--G4)]"
                      />
                    )}
                    <ChevronDown size={14} className="text-[var(--G3)] shrink-0" />
                  </div>
                  {errors.eid && <p className="text-xs text-[var(--RD)] mt-1">{errors.eid.message}</p>}
                  {showEidDrop && filteredEmployees.length > 0 && (
                    <ul
                      ref={eidListRef}
                      className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--G5)] [&::-webkit-scrollbar-thumb]:rounded-full"
                    >
                      {filteredEmployees.map((e, i) => (
                        <li
                          key={e.id}
                          onMouseDown={() => {
                            setValue('eid', e.id);
                            setEidSearch('');
                            setShowEidDrop(false);
                          }}
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
            )}

            {/* NJ-specific fields */}
            {selectedType === 'nj' && (
              <>
                <Input
                  label={t('njNameLabel')}
                  placeholder={t('njNamePlaceholder')}
                  error={errors.nj_name?.message}
                  {...register('nj_name')}
                />
                <div className="grid grid-cols-2 gap-4">
                  <DatePicker
                    label={t('startDateLabel')}
                    value={watch('start_date')}
                    onChange={(v) => setValue('start_date', v)}
                    error={errors.start_date?.message}
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--G2)]">{t('clLabel')}</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowClDrop((v) => !v)}
                        onBlur={() => setTimeout(() => setShowClDrop(false), 150)}
                        onKeyDown={(e) =>
                          clNav.onKey(
                            e,
                            (i) => { setValue('cl', CL_OPTIONS[i].value); setShowClDrop(false); },
                            () => setShowClDrop(false),
                          )
                        }
                        className={`flex items-center gap-2 w-full px-3 py-2 border rounded-lg bg-white text-sm text-left focus:outline-none transition-colors ${showClDrop ? 'border-[var(--P)] ring-1 ring-[var(--P)]' : 'border-[var(--G5)]'}`}
                      >
                        <span className={`flex-1 ${watch('cl') ? 'text-[var(--G1)]' : 'text-[var(--G4)]'}`}>
                          {CL_OPTIONS.find((o) => o.value === watch('cl'))?.label ?? '—'}
                        </span>
                        <ChevronDown size={14} className="text-[var(--G3)] shrink-0" />
                      </button>
                      {errors.cl && <p className="text-xs text-[var(--RD)] mt-1">{errors.cl.message}</p>}
                      {showClDrop && (
                        <ul ref={clListRef} className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden">
                          {CL_OPTIONS.map((o, i) => (
                            <li
                              key={o.value}
                              onMouseDown={() => { setValue('cl', o.value); setShowClDrop(false); }}
                              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${i === clNav.idx ? 'bg-[var(--G6)]' : watch('cl') === o.value ? 'bg-[var(--PB)] text-[var(--P)] font-medium' : 'text-[var(--G1)] hover:bg-[var(--G6)]'}`}
                            >
                              {o.label}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--G2)]">{t('locationLabel')}</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowLocationDrop((v) => !v)}
                        onBlur={() => setTimeout(() => setShowLocationDrop(false), 150)}
                        onKeyDown={(e) =>
                          locationNav.onKey(
                            e,
                            (i) => { setValue('location', LOCATION_OPTIONS[i].value); setShowLocationDrop(false); },
                            () => setShowLocationDrop(false),
                          )
                        }
                        className={`flex items-center gap-2 w-full px-3 py-2 border rounded-lg bg-white text-sm text-left focus:outline-none transition-colors ${showLocationDrop ? 'border-[var(--P)] ring-1 ring-[var(--P)]' : 'border-[var(--G5)]'}`}
                      >
                        <span className={`flex-1 ${watch('location') ? 'text-[var(--G1)]' : 'text-[var(--G4)]'}`}>
                          {LOCATION_OPTIONS.find((o) => o.value === watch('location'))?.label ?? '—'}
                        </span>
                        <ChevronDown size={14} className="text-[var(--G3)] shrink-0" />
                      </button>
                      {errors.location && <p className="text-xs text-[var(--RD)] mt-1">{errors.location.message}</p>}
                      {showLocationDrop && (
                        <ul ref={locationListRef} className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden">
                          {LOCATION_OPTIONS.map((o, i) => (
                            <li
                              key={o.value}
                              onMouseDown={() => { setValue('location', o.value); setShowLocationDrop(false); }}
                              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${i === locationNav.idx ? 'bg-[var(--G6)]' : watch('location') === o.value ? 'bg-[var(--PB)] text-[var(--P)] font-medium' : 'text-[var(--G1)] hover:bg-[var(--G6)]'}`}
                            >
                              {o.label}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <Input
                    label={t('peopleleadLabel')}
                    placeholder={t('peopleleadPlaceholder')}
                    error={errors.people_lead?.message}
                    {...register('people_lead')}
                  />
                </div>
                <Input
                  label={t('eidAccentureLabel')}
                  placeholder={t('eidAccenturePlaceholder')}
                  {...register('eid_accenture')}
                />
              </>
            )}

            {/* Client + Offering — newproj only */}
            {selectedType === 'newproj' && (
              <>
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
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setValue('client_name', '');
                                setClientSearch('');
                              }}
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
                          onChange={(e) => {
                            setClientSearch(e.target.value);
                            setShowClientDrop(true);
                          }}
                          onFocus={() => setShowClientDrop(true)}
                          onBlur={() => setTimeout(() => setShowClientDrop(false), 150)}
                          onKeyDown={(e) =>
                            clientNav.onKey(
                              e,
                              (i) => {
                                setValue('client_name', clientNavItems[i]);
                                setClientSearch('');
                                setShowClientDrop(false);
                              },
                              () => setShowClientDrop(false),
                            )
                          }
                          className="flex-1 text-sm text-[var(--G1)] outline-none bg-transparent placeholder:text-[var(--G4)]"
                        />
                      )}
                      <ChevronDown size={14} className="text-[var(--G3)] shrink-0" />
                    </div>
                    {errors.client_name && (
                      <p className="text-xs text-[var(--RD)] mt-1">{errors.client_name.message}</p>
                    )}
                    {showClientDrop && (filteredClients.length > 0 || clientSearch) && (
                      <ul
                        ref={clientListRef}
                        className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[var(--G5)] [&::-webkit-scrollbar-thumb]:rounded-full"
                      >
                        {filteredClients.map((c, i) => (
                          <li
                            key={c}
                            onMouseDown={() => {
                              setValue('client_name', c);
                              setClientSearch('');
                              setShowClientDrop(false);
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${i === clientNav.idx ? 'bg-[var(--G6)]' : 'text-[var(--G1)] hover:bg-[var(--G6)]'}`}
                          >
                            {c}
                          </li>
                        ))}
                        {hasCustomClient && (
                          <li
                            onMouseDown={() => {
                              setValue('client_name', clientSearch);
                              setClientSearch('');
                              setShowClientDrop(false);
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer border-t border-[var(--G6)] transition-colors ${filteredClients.length === clientNav.idx ? 'bg-[var(--G6)]' : 'text-[var(--P)] hover:bg-[var(--PB)]'}`}
                          >
                            + Usar &quot;{clientSearch}&quot;
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--G2)]">{t('offeringLabel')}</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowOfferingDrop((v) => !v)}
                      onBlur={() => setTimeout(() => setShowOfferingDrop(false), 150)}
                      onKeyDown={(e) =>
                        offeringNav.onKey(
                          e,
                          (i) => {
                            setValue('offering_type', OFFERING_OPTIONS[i].value);
                            setShowOfferingDrop(false);
                          },
                          () => setShowOfferingDrop(false),
                        )
                      }
                      className={`flex items-center gap-2 w-full px-3 py-2 border rounded-lg bg-white text-sm text-left focus:outline-none transition-colors ${showOfferingDrop ? 'border-[var(--P)] ring-1 ring-[var(--P)]' : 'border-[var(--G5)]'}`}
                    >
                      <span className={`flex-1 ${watch('offering_type') ? 'text-[var(--G1)]' : 'text-[var(--G4)]'}`}>
                        {OFFERING_OPTIONS.find((o) => o.value === watch('offering_type'))?.label ?? '—'}
                      </span>
                      <ChevronDown size={14} className="text-[var(--G3)] shrink-0" />
                    </button>
                    {errors.offering_type && <p className="text-xs text-[var(--RD)] mt-1">{errors.offering_type.message}</p>}
                    {showOfferingDrop && (
                      <ul
                        ref={offeringListRef}
                        className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-lg overflow-hidden"
                      >
                        {OFFERING_OPTIONS.map((o, i) => (
                          <li
                            key={o.value}
                            onMouseDown={() => {
                              setValue('offering_type', o.value);
                              setShowOfferingDrop(false);
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                              i === offeringNav.idx
                                ? 'bg-[var(--G6)]'
                                : watch('offering_type') === o.value
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
              </>
            )}

            {/* Chargeability — newproj and ongoing */}
            {(selectedType === 'newproj' || selectedType === 'ongoing') && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--G2)]">{t('chargeabilityLabel')}</label>
                  <div className="flex items-center h-9 rounded-lg border border-[var(--G5)] bg-white focus-within:border-[var(--P)] focus-within:ring-1 focus-within:ring-[var(--P)] transition-colors overflow-hidden">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      className="flex-1 min-w-0 h-full px-3 text-sm text-[var(--G1)] bg-transparent outline-none placeholder:text-[var(--G4)]"
                      {...register('chargeability_pct')}
                      onBlur={(e) => {
                        let val = e.target.value;
                        if (val !== '') {
                          let num = parseFloat(val);
                          if (isNaN(num)) { val = ''; }
                          else {
                            num = Math.round(Math.min(Math.max(num, 0), 100) * 10) / 10;
                            val = String(num);
                          }
                          setValue('chargeability_pct', val, { shouldValidate: true });
                        }
                      }}
                    />
                    <span className="px-2.5 text-sm text-[var(--G3)] border-l border-[var(--G5)] h-full flex items-center bg-[var(--G6)] shrink-0">%</span>
                  </div>
                  {errors.chargeability_pct && <p className="text-xs text-[var(--RD)]">{errors.chargeability_pct.message}</p>}
                </div>

                {/* Scenario type — Asunción / Efectivo */}
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
                        onClick={() => setValue('scenario_type', opt.value)}
                        className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                          (watch('scenario_type') ?? 'assumption') === opt.value
                            ? 'border-[var(--P)] bg-[var(--PB)] text-[var(--P)] font-medium'
                            : 'border-[var(--G5)] text-[var(--G2)] hover:bg-[var(--G6)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Hours — sick only */}
            {selectedType === 'sick' && (
              <Input
                label={t('hoursLabel')}
                type="number"
                min={1}
                error={errors.hours_to_move?.message}
                {...register('hours_to_move')}
              />
            )}

            {/* Start + end date in a row — newproj, pto, sick */}
            {(selectedType === 'newproj' ||
              selectedType === 'pto' ||
              selectedType === 'sick') && (
              <div className="grid grid-cols-2 gap-4">
                <DatePicker
                  label={t('startDateLabel')}
                  value={watch('start_date')}
                  onChange={(v) => setValue('start_date', v)}
                  error={errors.start_date?.message}
                />
                <DatePicker
                  label={t('endDateLabel')}
                  value={watch('end_date')}
                  onChange={(v) => setValue('end_date', v)}
                  error={errors.end_date?.message}
                />
              </div>
            )}

            {/* End date only — ongoing, baja */}
            {(selectedType === 'ongoing' || selectedType === 'baja') && (
              <DatePicker
                label={
                  selectedType === 'baja' ? t('endDateBajaLabel') : t('newEndDateLabel')
                }
                value={watch('end_date')}
                onChange={(v) => setValue('end_date', v)}
                error={errors.end_date?.message}
              />
            )}

            {/* Comments — all types */}
            {selectedType !== undefined && (
              <Textarea
                label={t('commentsLabel')}
                placeholder={t('commentsPlaceholder')}
                {...register('comments')}
              />
            )}
          </motion.div>
        </AnimatePresence>

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
