'use client';

import * as Sentry from '@sentry/nextjs';
import { HeartCrack } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-midnight px-6 text-cream">
        <main className="glass max-w-md rounded-3xl p-9 text-center">
          <HeartCrack
            className="mx-auto size-10 text-rose"
            aria-hidden="true"
          />
          <h1 className="type-display-section mt-5">Oops, the reel snapped.</h1>
          <p className="mt-3 text-sm leading-6 text-cream/60">
            Our little theater needs a moment. Let’s try again together.
          </p>
          <Button className="mt-7" onClick={reset}>
            Try again
          </Button>
        </main>
      </body>
    </html>
  );
}
