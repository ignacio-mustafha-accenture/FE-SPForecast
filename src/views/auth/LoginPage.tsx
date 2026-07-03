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
import { ApiError } from '@/src/adapters/http/fetcher';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      await getClientContainer().login.execute(data.email, data.password);
      const from = searchParams.get('from') ?? '/';
      router.push(from);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setServerError('FO-ERR-001: Credenciales inválidas');
      } else {
        setServerError('Error de conexión. Intente nuevamente.');
      }
    }
  }

  return (
    <div className="rounded-xl border border-[var(--G5)] bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--G1)] mb-6">Iniciar sesión</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="nombre@accenture.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        {serverError && (
          <p className="text-xs text-[var(--RD)] font-mono bg-[var(--RDB)] px-3 py-2 rounded">
            {serverError}
          </p>
        )}
        <Button type="submit" loading={isSubmitting} className="w-full mt-1">
          Ingresar
        </Button>
      </form>
      <div className="mt-4 text-center">
        <Link href="/forgot-password" className="text-xs text-[var(--P)] hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </div>
  );
}
