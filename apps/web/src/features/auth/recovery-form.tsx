'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-client';

const emailSchema = z.object({
  email: z.string().trim().email('Add a valid email address'),
});
const resetSchema = z
  .object({
    password: z.string().min(12, 'Choose at least 12 characters').max(128),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Those passwords do not match',
  });

export function RequestResetForm(): JSX.Element {
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const submit = handleSubmit(async (values) => {
    setError(null);
    setNotice(null);
    try {
      const result = await apiFetch<{ message: string }>(
        '/auth/password/reset/request',
        { method: 'POST', body: values },
      );
      setNotice(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.');
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        aria-invalid={Boolean(errors.email)}
        {...register('email')}
      />
      {errors.email && (
        <p role="alert" className="text-xs text-blush">
          {errors.email.message}
        </p>
      )}
      <FormMessage error={error} notice={notice} />
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending a little note…' : 'Send reset link'}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }): JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const submit = handleSubmit(async ({ password, confirmPassword }) => {
    setError(null);
    try {
      await apiFetch('/auth/password/reset', {
        method: 'POST',
        body: { token, password },
      });
      setComplete(true);
      window.setTimeout(() => router.replace('/login'), 1800);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.');
    }
  });

  if (complete) {
    return (
      <p
        role="status"
        className="rounded-xl bg-rose/10 p-4 text-center text-sm text-blush"
      >
        Your password is changed. Taking you back to your seat…
      </p>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        aria-invalid={Boolean(errors.password)}
        {...register('password')}
      />
      {errors.password && (
        <p role="alert" className="text-xs text-blush">
          {errors.password.message}
        </p>
      )}
      <Input
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        aria-invalid={Boolean(errors.confirmPassword)}
        {...register('confirmPassword')}
      />
      {errors.confirmPassword && (
        <p role="alert" className="text-xs text-blush">
          {errors.confirmPassword.message}
        </p>
      )}
      <FormMessage error={error} />
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || token.length < 20}
      >
        {isSubmitting ? 'Saving your new password…' : 'Set new password'}
      </Button>
    </form>
  );
}

function FormMessage({
  error,
  notice,
}: {
  error: string | null;
  notice?: string | null;
}): JSX.Element | null {
  if (error) {
    return (
      <p role="alert" className="text-sm text-blush">
        {error}
      </p>
    );
  }
  return notice ? (
    <p role="status" className="text-sm text-blush">
      {notice}
    </p>
  ) : null;
}
