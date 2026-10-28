'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { fadeUp, springs } from '@/lib/motion';

export function HeartLoader({
  label = 'Preparing your date night',
}: {
  label?: string;
}): JSX.Element {
  return (
    <div
      className="flex flex-col items-center gap-3 text-center"
      role="status"
      aria-label={label}
    >
      <motion.div
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 1.15, repeat: Infinity, ease: 'easeInOut' }}
        className="text-rose drop-shadow-[0_0_18px_rgb(232_70_108_/_0.6)] motion-reduce:animate-none"
      >
        <Heart className="size-10 fill-current" aria-hidden="true" />
      </motion.div>
      <span className="text-xs text-cream/55">{label}</span>
    </div>
  );
}

export function SeatsLoader(): JSX.Element {
  return (
    <motion.div
      className="flex items-end gap-3"
      role="status"
      aria-label="Saving two seats"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
    >
      {[0, 1].map((seat) => (
        <motion.div
          key={seat}
          className="relative flex h-12 w-10 items-end justify-center rounded-t-2xl border border-rose/35 bg-wine/60 p-1"
          initial={{ opacity: 0.35 }}
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{
            ...springs.soft,
            duration: 1.1,
            repeat: Infinity,
            delay: seat * 0.2,
          }}
        >
          <span className="h-2 w-7 rounded-sm bg-rose/80" />
        </motion.div>
      ))}
    </motion.div>
  );
}
