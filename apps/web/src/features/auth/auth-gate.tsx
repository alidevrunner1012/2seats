'use client';

import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore, type AuthUser } from '@/store/auth-store';

export function AuthGate({ children }: { children: ReactNode }): JSX.Element {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const clear = useAuthStore((state) => state.clear);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<AuthUser>('/auth/me')
      .then((user) => {
        if (active) {
          setUser(user);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          clear();
          router.replace('/login');
        }
      });
    return () => {
      active = false;
    };
  }, [clear, router, setUser]);

  if (!ready) {
    return (
      <main
        className="mx-auto flex min-h-[70svh] w-full max-w-5xl flex-col justify-center gap-5 px-5 py-12"
        aria-label="Finding your seat"
      >
        <div className="flex items-center gap-3 text-blush">
          <Heart className="size-5 animate-heart fill-current motion-reduce:animate-none" />
          <span className="text-sm">Finding your seat…</span>
        </div>
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </main>
    );
  }
  return <>{children}</>;
}
