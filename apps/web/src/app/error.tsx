'use client';

import { motion } from 'framer-motion';
import { HeartCrack } from 'lucide-react';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { fadeUp, stagger } from '@/lib/motion';

export default function Error({
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
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <motion.section
        className="glass max-w-lg rounded-[2rem] p-9 text-center sm:p-12"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={fadeUp}
          className="mb-5 flex justify-center text-rose"
        >
          <HeartCrack className="size-11" aria-hidden="true" />
        </motion.div>
        <motion.p
          variants={fadeUp}
          className="text-xs uppercase tracking-[0.25em] text-blush/70"
        >
          A little intermission
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="type-display-section gradient-text mt-4"
        >
          Oops, the reel snapped.
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="mt-4 text-sm leading-6 text-cream/60"
        >
          The movie night hit a small bump. Let’s give it another try.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8">
          <Button onClick={reset}>Try again</Button>
        </motion.div>
      </motion.section>
    </main>
  );
}
