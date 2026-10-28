'use client';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const PARTICLES = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2;
  const dist = 140 + (i % 3) * 50;
  return { i, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
});

/** Full-screen celebration. Change `burstKey` to replay. */
export function BigBurst({ burstKey, emoji = '❤️' }: { burstKey: number; emoji?: string }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] grid place-items-center">
      <AnimatePresence>
        {burstKey > 0 && (
          <motion.div key={burstKey} className="relative" initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 1.6 }}>
            <motion.span className="absolute -translate-x-1/2 -translate-y-1/2 text-7xl"
              initial={{ scale: 0 }} animate={{ scale: reduce ? 1 : [0, 1.4, 1] }} transition={{ duration: 0.6 }}>{emoji}</motion.span>
            {!reduce && PARTICLES.map((p) => (
              <motion.span key={p.i} className="absolute text-2xl"
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }} animate={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
                transition={{ duration: 1.3, ease: 'easeOut' }}>{emoji}</motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
