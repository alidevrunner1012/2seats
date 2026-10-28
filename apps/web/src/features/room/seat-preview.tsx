import { motion } from 'framer-motion';
import { Heart, Sparkles } from 'lucide-react';
import { hoverLift, stagger } from '@/lib/motion';

export function SeatPreview(): JSX.Element {
  return (
    <motion.div
      className="relative mx-auto flex w-full max-w-md items-center justify-center gap-2 py-8 sm:gap-4 sm:px-6"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        variants={hoverLift}
        initial="idle"
        whileHover="hover"
        className="glass relative w-[min(36vw,9rem)] rounded-b-2xl rounded-t-[2rem] border-rose/25 px-2 pb-4 pt-5 text-center shadow-rose sm:px-4"
      >
        <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-gradient-to-br from-rose to-wine text-cream">
          <span className="font-display text-xl">Y</span>
        </div>
        <span className="text-xs text-cream/65">Your seat</span>
        <div className="mt-3 h-2 rounded-full bg-rose/50" />
      </motion.div>
      <div className="flex flex-col items-center gap-2 text-candle">
        <Sparkles className="size-4" aria-hidden="true" />
        <span className="h-10 w-px bg-gradient-to-b from-candle/50 to-transparent" />
        <Heart className="size-3 fill-current" aria-hidden="true" />
      </div>
      <motion.div
        variants={hoverLift}
        initial="idle"
        whileHover="hover"
        className="glass relative w-[min(36vw,9rem)] rounded-b-2xl rounded-t-[2rem] border-blush/25 px-2 pb-4 pt-5 text-center shadow-amber sm:px-4"
      >
        <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-gradient-to-br from-blush/80 to-wine text-midnight">
          <Heart className="size-6 fill-current" aria-hidden="true" />
        </div>
        <span className="text-xs text-cream/65">Their seat</span>
        <div className="mt-3 h-2 rounded-full bg-blush/50" />
      </motion.div>
    </motion.div>
  );
}
