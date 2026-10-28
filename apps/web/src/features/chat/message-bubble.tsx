import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { fadeUp } from '@/lib/motion';

export function MessageBubble({
  message,
  mine = false,
}: {
  message: string;
  mine?: boolean;
}): JSX.Element {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
    >
      {!mine && (
        <div className="grid size-7 place-items-center rounded-full bg-wine text-[10px] text-blush">
          M
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-5 ${
          mine
            ? 'rounded-br-md bg-rose/20 text-cream'
            : 'glass rounded-bl-md text-cream/80'
        }`}
      >
        {message}
      </div>
      {mine && (
        <Heart className="mb-1 size-3 fill-rose text-rose" aria-hidden="true" />
      )}
    </motion.div>
  );
}
