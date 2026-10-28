'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, DoorOpen, LockKeyhole, UsersRound } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthGate } from '@/features/auth/auth-gate';
import { apiFetch, ApiError } from '@/lib/api-client';
import { fadeUp, scaleIn } from '@/lib/motion';

export default function JoinPage(): JSX.Element {
  return <AuthGate><JoinContent /></AuthGate>;
}

function JoinContent(): JSX.Element {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState<{ title: string; message: string; kind: 'expired' | 'full' | 'locked' | 'unknown' } | null>(null);

  useEffect(() => {
    const token = params.token;
    if (typeof token !== 'string') return;
    apiFetch<{ id: string }>(`/rooms/join/${encodeURIComponent(token)}`)
      .then((room) => router.replace(`/room/${room.id}/lobby`))
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : 'This invite could not be opened.';
        const kind = /expired|invalid/i.test(message) ? 'expired' : /full/i.test(message) ? 'full' : /locked/i.test(message) ? 'locked' : 'unknown';
        setError({
          kind,
          title: kind === 'expired' ? 'This invite has drifted away' : kind === 'full' ? 'Both seats are taken' : kind === 'locked' ? 'The room is tucked away' : 'We could not open this room',
          message,
        });
      });
  }, [params.token, router]);

  return (
    <main className="grid min-h-[100svh] place-items-center px-5 py-12">
      {error === null ? (
        <div className="text-center text-cream"><DoorOpen className="mx-auto mb-4 size-8 animate-pulse text-rose motion-reduce:animate-none" /><p>Finding your seat…</p></div>
      ) : (
        <motion.section variants={scaleIn} initial="hidden" animate="visible" className="glass w-full max-w-md rounded-3xl p-8 text-center">
          <ErrorIcon kind={error.kind} />
          <motion.h1 variants={fadeUp} className="type-display-card mt-5 text-cream">{error.title}</motion.h1>
          <p className="mt-3 text-sm leading-6 text-cream/60">{error.message}</p>
          <button type="button" className="mt-6 text-sm text-blush underline underline-offset-4" onClick={() => router.push('/dashboard')}>Return to your rooms</button>
        </motion.section>
      )}
    </main>
  );
}

function ErrorIcon({ kind }: { kind: 'expired' | 'full' | 'locked' | 'unknown' }): JSX.Element {
  const Icon = kind === 'full' ? UsersRound : kind === 'locked' ? LockKeyhole : AlertTriangle;
  return <div className="mx-auto grid size-20 place-items-center rounded-full bg-rose/10 text-rose"><Icon className="size-9" /></div>;
}
