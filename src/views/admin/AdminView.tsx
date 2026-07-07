'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { getClientContainer } from '@/src/application/container';
import { Button } from '@/src/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { useToast } from '@/src/hooks/useToast';
import { useForecastStore } from '@/src/store/StoreProvider';

export function AdminView() {
  const t = useTranslations('admin');
  const toast = useToast();
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [clients, setClients] = useState<string[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [newClient, setNewClient] = useState('');
  const [addingClient, setAddingClient] = useState(false);
  const periodLabel = useForecastStore((s) => s.appState?.period.label ?? '');

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
      // silently fail — clients section is non-critical
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
      await fetchClients();
    } catch {
      toast.error(t('clientAddError'));
    } finally {
      setAddingClient(false);
    }
  }

  async function handleRecalculate() {
    if (!periodLabel) {
      toast.error(t('toastNoPeriod'));
      return;
    }
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
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-[var(--BK)]">{t('title')}</h1>
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

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-[var(--G1)]">{t('clientsTitle')}</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <p className="text-xs text-[var(--G3)]">{t('clientsDesc')}</p>
            <div className="flex gap-2">
              <Input
                placeholder={t('clientPlaceholder')}
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClient()}
                className="flex-1"
              />
              <Button loading={addingClient} onClick={handleAddClient}>
                {t('addClient')}
              </Button>
            </div>
            {clientsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
              </div>
            ) : clients.length === 0 ? (
              <p className="text-sm text-[var(--G3)]">{t('noClients')}</p>
            ) : (
              <ul className="divide-y divide-[var(--G6)]">
                {clients.map((c) => (
                  <li key={c} className="py-2 text-sm text-[var(--G1)]">{c}</li>
                ))}
              </ul>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
