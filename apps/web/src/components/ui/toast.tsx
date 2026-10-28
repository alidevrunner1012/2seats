'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import { fadeUp, pressable, springs } from '@/lib/motion';
import { useToastStore } from '@/hooks/use-toast';

export function ToastViewport(): JSX.Element {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <ol
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-[100] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-3"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.li
            key={toast.id}
            className="glass flex items-start gap-3 rounded-2xl border-rose/25 p-4 shadow-rose"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={springs.soft}
          >
            <Heart
              className="mt-0.5 size-4 shrink-0 fill-rose text-rose"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cream">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 text-xs leading-5 text-cream/60">
                  {toast.description}
                </p>
              )}
            </div>
            <motion.button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded-full p-1 text-cream/50 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
              variants={pressable}
              initial="idle"
              whileHover="hover"
              whileTap="press"
              aria-label="Dismiss notification"
            >
              <X className="size-4" aria-hidden="true" />
            </motion.button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}
