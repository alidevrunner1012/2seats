'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore, type AuthSession } from '@/store/auth-store';

export function VerifyEmail({ token }: { token: string }): JSX.Element {
  const [status, setStatus] = useState('We’re checking your note…');
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    if (token.length < 20) {
      setStatus('This verification link is missing or incomplete.');
      setError(true);
      return () => {
        active = false;
      };
    }
    apiFetch<{ message: string }>('/auth/email/verify', {
      method: 'POST',
      body: { token },
    })
      .then((result) => {
        if (active) setStatus(result.message);
      })
      .catch((cause: unknown) => {
        if (active) {
          setStatus(
            cause instanceof Error ? cause.message : 'Please try again.',
          );
          setError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div
      className={`rounded-2xl p-4 text-center text-sm ${error ? 'bg-rose/10 text-blush' : 'bg-candle/10 text-candle'}`}
      role={error ? 'alert' : 'status'}
    >
      {status}
    </div>
  );
}

export function GoogleCallback({
  code,
  state,
  oauthError,
}: {
  code: string;
  state: string;
  oauthError: string;
}): JSX.Element {
  const router = useRouter();
  const setSession = useAuthStore((store) => store.setSession);
  const [message, setMessage] = useState('Bringing both seats together…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const expectedState = sessionStorage.getItem('2seats:oauth-state');
    sessionStorage.removeItem('2seats:oauth-state');
    if (
      oauthError ||
      code.length === 0 ||
      expectedState === null ||
      state !== expectedState
    ) {
      setMessage(
        oauthError || 'This Google sign-in link could not be verified.',
      );
      setFailed(true);
      return () => {
        active = false;
      };
    }
    const redirectUri = new URL('/auth/callback', window.location.origin);
    apiFetch<AuthSession>('/auth/google', {
      method: 'POST',
      body: { code, redirectUri: redirectUri.toString() },
    })
      .then((session) => {
        if (active) {
          setSession(session);
          router.replace('/dashboard');
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setMessage(
            cause instanceof Error
              ? cause.message
              : 'Google sign-in failed. Check the OAuth redirect URI and API credentials.',
          );
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [code, oauthError, router, setSession, state]);

  return (
    <div className="space-y-4 text-center">
      <p
        role={failed ? 'alert' : 'status'}
        className={failed ? 'text-blush' : 'text-cream/60'}
      >
        {message}
      </p>
      {failed && (
        <Button onClick={() => router.replace('/login')}>
          Back to sign in
        </Button>
      )}
    </div>
  );
}
