'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

import { getClientContainer } from '@/src/application/container';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';

type FormData = { password: string; confirm: string };

export function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [serverError, setServerError] = useState('');

  const schema = z
    .object({
      password: z.string().min(8, t('minChars')),
      confirm: z.string(),
    })
    .refine((d) => d.password === d.confirm, {
      message: t('passwordMismatch'),
      path: ['confirm'],
    });

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
      setServerError(t('serverError'));
    }
  }

  if (!token) {
    return (
      <div className="rounded-xl border border-[var(--G5)] bg-white p-8 shadow-sm text-center">
        <p className="text-[var(--RD)] text-sm">{t('invalidLink')}</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-xs text-[var(--P)] hover:underline">
          {t('requestNewLink')}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--G5)] bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--G1)] mb-6">{t('title')}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label={t('newPasswordLabel')}
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label={t('confirmLabel')}
          type="password"
          placeholder="••••••••"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        {serverError && (
          <p className="text-xs text-[var(--RD)] bg-[var(--RDB)] px-3 py-2 rounded">{serverError}</p>
        )}
        <Button type="submit" loading={isSubmitting} className="w-full">
          {t('submit')}
        </Button>
      </form>
    </div>
  );
}
