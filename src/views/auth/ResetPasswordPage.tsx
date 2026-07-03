'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { getClientContainer } from '@/src/application/container';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      await getClientContainer().resetPassword.execute(token, data.password);
      router.push('/login');
    } catch {
      setServerError('El enlace expiró o es inválido. Solicitá uno nuevo.');
    }
  }

  if (!token) {
    return (
      <div className="rounded-xl border border-[var(--G5)] bg-white p-8 shadow-sm text-center">
        <p className="text-[var(--RD)] text-sm">Enlace inválido o expirado.</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-xs text-[var(--P)] hover:underline">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--G5)] bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--G1)] mb-6">Nueva contraseña</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Nueva contraseña"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirmar contraseña"
          type="password"
          placeholder="••••••••"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        {serverError && (
          <p className="text-xs text-[var(--RD)] bg-[var(--RDB)] px-3 py-2 rounded">{serverError}</p>
        )}
        <Button type="submit" loading={isSubmitting} className="w-full">
          Guardar contraseña
        </Button>
      </form>
    </div>
  );
}
