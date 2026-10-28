'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, apiFetch } from '@/lib/api-client';
import { env } from '@/lib/env';
import { useAuthStore, type AuthSession } from '@/store/auth-store';

const loginSchema = z.object({
  email: z.string().trim().email('Add a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

const signupSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Use at least 2 characters')
      .max(40, 'Keep your name under 40 characters'),
    email: z.string().trim().email('Add a valid email address'),
    password: z
      .string()
      .min(12, 'Choose at least 12 characters')
      .max(128, 'Keep your password under 128 characters'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Those passwords do not match',
  });

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

function messageFromError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'We couldn’t reach your seat just now. Please try again.';
}

function GoogleButton(): JSX.Element {
  const [unavailable, setUnavailable] = useState(false);
  const beginGoogleLogin = (): void => {
    if (env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.length === 0) {
      setUnavailable(true);
      return;
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem('2seats:oauth-state', state);
    const redirectUri = new URL('/auth/callback', window.location.origin);
    const query = new URLSearchParams({
      client_id: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri.toString(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
    });
    window.location.assign(
      `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`,
    );
  };

  return (
    <div>
      <Button
        type="button"
        variant="glass"
        className="w-full"
        onClick={beginGoogleLogin}
      >
        <GoogleMark />
        Continue with Google
      </Button>
      {unavailable && (
        <p role="alert" className="mt-2 text-center text-xs text-blush">
          Google sign-in is not configured yet.
        </p>
      )}
    </div>
  );
}

function GoogleMark(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.34 2.98-7.37Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.4l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.92a6.02 6.02 0 0 1 0-3.84v-2.6H3.06a10 10 0 0 0 0 9.04l3.35-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.95 2.98 14.7 2 12 2a10 10 0 0 0-8.94 5.48l3.35 2.6C7.2 7.72 9.4 5.96 12 5.96Z"
      />
    </svg>
  );
}

function PasswordStrength({ password }: { password: string }): JSX.Element {
  const score =
    Number(password.length >= 12) +
    Number(/[A-Z]/.test(password) && /[a-z]/.test(password)) +
    Number(/\d/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password));
  const labels = ['A little more', 'Getting there', 'Lovely', 'So strong'];

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((step) => (
          <motion.div
            key={step}
            initial={false}
            animate={{ scale: step < score ? [0.86, 1] : 0.82 }}
            transition={{ duration: 0.2 }}
          >
            <Heart
              className={`size-4 transition-colors ${step < score ? 'fill-rose text-rose' : 'text-cream/20'}`}
            />
          </motion.div>
        ))}
        <span className="ml-1 text-xs text-cream/50">
          {password.length > 0
            ? labels[Math.max(0, score - 1)]
            : 'Password strength'}
        </span>
      </div>
      <div
        className="sr-only"
        role="progressbar"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
      />
    </div>
  );
}

export function LoginForm(): JSX.Element {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const session = await apiFetch<AuthSession>('/auth/login', {
        method: 'POST',
        body: values,
      });
      setSession(session);
      router.replace('/dashboard');
    } catch (error) {
      setServerError(messageFromError(error));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field error={errors.email?.message}>
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
      </Field>
      <Field error={errors.password?.message}>
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
      </Field>
      <div className="text-right">
        <Link
          href="/forgot-password"
          className="text-sm text-blush/80 hover:text-blush"
        >
          Forgot password?
        </Link>
      </div>
      <FormError message={serverError} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Finding your seat…' : 'Welcome back'}
      </Button>
      <Divider />
      <GoogleButton />
    </form>
  );
}

export function SignupForm(): JSX.Element {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });
  const password = watch('password');

  const submit = handleSubmit(
    async ({ confirmPassword: _confirmPassword, ...values }) => {
      setServerError(null);
      try {
        const session = await apiFetch<AuthSession>('/auth/signup', {
          method: 'POST',
          body: values,
        });
        setSession(session);
        router.replace('/dashboard');
      } catch (error) {
        setServerError(messageFromError(error));
      }
    },
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field error={errors.displayName?.message}>
        <Input
          label="What should we call you?"
          autoComplete="name"
          aria-invalid={Boolean(errors.displayName)}
          {...register('displayName')}
        />
      </Field>
      <Field error={errors.email?.message}>
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
      </Field>
      <Field error={errors.password?.message}>
        <Input
          label="Create a password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        <PasswordStrength password={password} />
      </Field>
      <Field error={errors.confirmPassword?.message}>
        <Input
          label="One more time"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
      </Field>
      <FormError message={serverError} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Saving your seat…' : 'Create your account'}
      </Button>
      <Divider />
      <GoogleButton />
    </form>
  );
}

function Field({
  error,
  children,
}: {
  error?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <motion.div
      animate={error ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }}
      transition={{ duration: 0.28 }}
    >
      {children}
      {error && (
        <p role="alert" className="mt-1.5 px-2 text-xs text-blush">
          {error}
        </p>
      )}
    </motion.div>
  );
}

function FormError({
  message,
}: {
  message: string | null;
}): JSX.Element | null {
  return message ? (
    <p
      role="alert"
      className="rounded-xl border border-rose/30 bg-rose/10 p-3 text-sm text-blush"
    >
      {message}
    </p>
  ) : null;
}

function Divider(): JSX.Element {
  return (
    <div className="flex items-center gap-3 py-1 text-xs text-cream/35">
      <span className="h-px flex-1 bg-cream/10" />
      or
      <span className="h-px flex-1 bg-cream/10" />
    </div>
  );
}
