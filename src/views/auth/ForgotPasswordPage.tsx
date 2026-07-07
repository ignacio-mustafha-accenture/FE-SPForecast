'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

import { getClientContainer } from '@/src/application/container';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';

type FormData = { email: string };

export function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword');
  const [sent, setSent] = useState(false);

  const schema = z.object({ email: z.string().email(t('emailInvalid')) });

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
        <p className="text-[var(--GR)] font-medium mb-2">{t('successTitle')}</p>
        <p className="text-sm text-[var(--G2)]">{t('successBody')}</p>
        <Link href="/login" className="mt-4 inline-block text-xs text-[var(--P)] hover:underline">
          {t('backToLoginBtn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--G5)] bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--G1)] mb-2">{t('title')}</h2>
      <p className="text-sm text-[var(--G2)] mb-6">{t('subtitle')}</p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label={t('emailLabel')}
          type="email"
          placeholder="nombre@accenture.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          {t('submit')}
        </Button>
      </form>
      <div className="mt-4 text-center">
        <Link href="/login" className="text-xs text-[var(--G3)] hover:text-[var(--G1)]">
          {t('backToLogin')}
        </Link>
      </div>
    </div>
  );
}
