'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { getClientContainer } from '@/src/application/container';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';

const schema = z.object({ email: z.string().email('Email inválido') });
type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    await getClientContainer().forgotPassword.execute(data.email);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-[var(--G5)] bg-white p-8 shadow-sm text-center">
        <p className="text-[var(--GR)] font-medium mb-2">✓ Email enviado</p>
        <p className="text-sm text-[var(--G2)]">
          Si el email existe en el sistema, recibirás instrucciones para recuperar tu contraseña.
        </p>
        <Link href="/login" className="mt-4 inline-block text-xs text-[var(--P)] hover:underline">
          Volver al login
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--G5)] bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--G1)] mb-2">Recuperar contraseña</h2>
      <p className="text-sm text-[var(--G2)] mb-6">Ingresá tu email y te enviaremos un enlace.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="nombre@accenture.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          Enviar enlace
        </Button>
      </form>
      <div className="mt-4 text-center">
        <Link href="/login" className="text-xs text-[var(--G3)] hover:text-[var(--G1)]">
          ← Volver al login
        </Link>
      </div>
    </div>
  );
}
