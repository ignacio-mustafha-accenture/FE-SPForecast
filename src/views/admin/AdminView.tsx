'use client';

import { useState } from 'react';

import { getClientContainer } from '@/src/application/container';
import { Button } from '@/src/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { useToast } from '@/src/hooks/useToast';
import { useForecastStore } from '@/src/store/StoreProvider';

export function AdminView() {
  const toast = useToast();
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const periodLabel = useForecastStore((s) => s.appState?.period.label ?? '');

  async function handleRecalculate() {
    if (!periodLabel) {
      toast.error('No hay período cargado');
      return;
    }
    setRecalcLoading(true);
    try {
      await getClientContainer().recalculate.execute(periodLabel);
      toast.success('Recálculo ejecutado correctamente');
    } catch {
      toast.error('Error al ejecutar recálculo');
    } finally {
      setRecalcLoading(false);
    }
  }

  async function handleSync() {
    setSyncLoading(true);
    try {
      await getClientContainer().sync.execute();
      toast.success('Sincronización completada');
    } catch {
      toast.error('Error al sincronizar');
    } finally {
      setSyncLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-[var(--BK)]">Administración</h1>
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-[var(--G1)]">Operaciones del sistema</h2>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between py-2 border-b border-[var(--G5)]">
              <div>
                <p className="text-sm font-medium text-[var(--G1)]">Recalcular chargeability</p>
                <p className="text-xs text-[var(--G3)]">Ejecuta el motor de cálculo sobre el período actual</p>
              </div>
              <Button variant="ghost" loading={recalcLoading} onClick={handleRecalculate}>
                Ejecutar
              </Button>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-[var(--G1)]">Sincronizar datos</p>
                <p className="text-xs text-[var(--G3)]">Importa datos desde la fuente externa</p>
              </div>
              <Button variant="ghost" loading={syncLoading} onClick={handleSync}>
                Sincronizar
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
