'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X, Pencil, Check, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' as const, delay: Math.min(i * 0.04, 0.20) },
  }),
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

import { getClientContainer } from '@/src/application/container';
import { Button } from '@/src/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { useToast } from '@/src/hooks/useToast';
import { useForecastStore } from '@/src/store/StoreProvider';

// ---- ClientTag ----

interface ClientTagProps {
  name: string;
  onDelete: () => void;
  onRename: (newName: string) => void;
}

function ClientTag({ name, onDelete, onRename }: ClientTagProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    setEditing(false);
  }

  function cancel() {
    setValue(name);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-2 px-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          className="flex-1 px-2 py-1 text-sm border border-[var(--P)] rounded bg-[var(--PB)] text-[var(--P)] font-medium outline-none"
        />
        <button onClick={commit} className="text-[var(--P)] hover:opacity-70 transition-opacity" title="Guardar">
          <Check size={15} />
        </button>
        <button onClick={cancel} className="text-[var(--G3)] hover:text-[var(--G1)] transition-colors" title="Cancelar">
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 py-2 px-1">
      <span className="flex-1 text-sm text-[var(--G1)]">{name}</span>
      <button
        onClick={() => { setValue(name); setEditing(true); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--G3)] hover:text-[var(--G1)]"
        title="Renombrar"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--G3)] hover:text-red-500"
        title="Eliminar"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ---- AdminView ----

export function AdminView() {
  const t = useTranslations('admin');
  const toast = useToast();
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [clients, setClients] = useState<string[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [newClient, setNewClient] = useState('');
  const [addingClient, setAddingClient] = useState(false);
  const [filter, setFilter] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const periodLabel = useForecastStore((s) => s.appState?.period.label ?? '');

  const filteredClients = filter
    ? clients.filter((c) => c.toLowerCase().includes(filter.toLowerCase()))
    : clients;

  const suggestions = newClient.trim()
    ? clients.filter(
        (c) =>
          c.toLowerCase().includes(newClient.toLowerCase()) &&
          c.toLowerCase() !== newClient.toLowerCase()
      )
    : [];

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    setClientsLoading(true);
    try {
      const res = await fetch('/api/admin/clients', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients ?? []);
      }
    } catch {
      // silently fail — non-critical section
    } finally {
      setClientsLoading(false);
    }
  }

  async function handleAddClient() {
    const name = newClient.trim();
    if (!name) return;
    setAddingClient(true);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('clientAdded'));
      setNewClient('');
      setShowSuggestions(false);
      await fetchClients();
    } catch {
      toast.error(t('clientAddError'));
    } finally {
      setAddingClient(false);
    }
  }

  async function handleDeleteClient(name: string) {
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.detail ?? t('clientDeleteError'));
        return;
      }
      toast.success(t('clientDeleted'));
      await fetchClients();
    } catch {
      toast.error(t('clientDeleteError'));
    }
  }

  async function handleRenameClient(oldName: string, newName: string) {
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(oldName)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: newName }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('clientRenamed'));
      await fetchClients();
    } catch {
      toast.error(t('clientRenameError'));
    }
  }

  async function handleRecalculate() {
    if (!periodLabel) { toast.error(t('toastNoPeriod')); return; }
    setRecalcLoading(true);
    try {
      await getClientContainer().recalculate.execute(periodLabel);
      toast.success(t('toastRecalcOk'));
    } catch {
      toast.error(t('toastRecalcError'));
    } finally {
      setRecalcLoading(false);
    }
  }

  async function handleSync() {
    setSyncLoading(true);
    try {
      await getClientContainer().sync.execute();
      toast.success(t('toastSyncOk'));
    } catch {
      toast.error(t('toastSyncError'));
    } finally {
      setSyncLoading(false);
    }
  }

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="show">
      <motion.h1 variants={cardVariants} className="text-xl font-bold text-[var(--BK)]">{t('title')}</motion.h1>

      {/* Operations — constrained width */}
      <motion.div variants={cardVariants} className="max-w-2xl">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--G1)]">{t('operations')}</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between py-2 border-b border-[var(--G5)]">
                <div>
                  <p className="text-sm font-medium text-[var(--G1)]">{t('recalculate')}</p>
                  <p className="text-xs text-[var(--G3)]">{t('recalculateDesc')}</p>
                </div>
                <Button variant="ghost" loading={recalcLoading} onClick={handleRecalculate}>
                  {t('execute')}
                </Button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-[var(--G1)]">{t('sync')}</p>
                  <p className="text-xs text-[var(--G3)]">{t('syncDesc')}</p>
                </div>
                <Button variant="ghost" loading={syncLoading} onClick={handleSync}>
                  {t('syncBtn')}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Clients — full width */}
      <motion.div variants={cardVariants}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--G1)]">{t('clientsTitle')}</h2>
            <span className="text-xs text-[var(--G3)]">{clients.length} {t('clientsCount')}</span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">

            {/* Filter + Add */}
            <div className="flex gap-2">
              {/* Filter */}
              <div className="flex items-center gap-2 flex-1 px-3 py-2 border border-[var(--G5)] rounded-lg bg-[var(--G6)]">
                <Search size={14} className="text-[var(--G3)] shrink-0" />
                <input
                  placeholder={t('clientFilterPlaceholder')}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-[var(--G1)] outline-none placeholder:text-[var(--G4)]"
                />
                {filter && (
                  <button onClick={() => setFilter('')} className="text-[var(--G3)] hover:text-[var(--G1)] transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Add */}
              <div className="relative flex-1">
                <input
                  placeholder={t('clientPlaceholder')}
                  value={newClient}
                  onChange={(e) => { setNewClient(e.target.value); setShowSuggestions(true); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddClient();
                    if (e.key === 'Escape') setShowSuggestions(false);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className="w-full px-3 py-2 text-sm border border-[var(--G5)] rounded-lg bg-white text-[var(--G1)] outline-none focus:border-[var(--P)] transition-colors placeholder:text-[var(--G4)]"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-[var(--G5)] rounded-lg shadow-md overflow-hidden">
                    {suggestions.slice(0, 6).map((s) => (
                      <li
                        key={s}
                        onMouseDown={() => { setNewClient(s); setShowSuggestions(false); }}
                        className="px-3 py-2 text-sm text-[var(--G1)] hover:bg-[var(--G6)] cursor-pointer"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button loading={addingClient} onClick={handleAddClient} className="flex items-center gap-1.5 shrink-0">
                <Plus size={14} />
                {t('addClient')}
              </Button>
            </div>

            {/* Client list */}
            {clientsLoading ? (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-full" />
                ))}
              </div>
            ) : filteredClients.length === 0 ? (
              <p className="text-sm text-[var(--G3)]">
                {filter ? t('noClientMatch') : t('noClients')}
              </p>
            ) : (
              <div className="divide-y divide-[var(--G6)]">
                <AnimatePresence mode="sync">
                  {filteredClients.map((c, i) => (
                    <motion.div
                      key={c}
                      custom={i}
                      variants={itemVariants}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                    >
                      <ClientTag
                        name={c}
                        onDelete={() => handleDeleteClient(c)}
                        onRename={(newName) => handleRenameClient(c, newName)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

          </div>
        </CardBody>
      </Card>
      </motion.div>
    </motion.div>
  );
}
