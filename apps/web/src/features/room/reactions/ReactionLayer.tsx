'use client';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSocket } from '../../_adapters';
import { capList, emojiFor } from './reactions';

interface Fly { id: string; emoji: string; x: number }

export function ReactionLayer() {
  const socket = useSocket();
  const reduce = useReducedMotion();
  const [items, setItems] = useState<Fly[]>([]);

  useEffect(() => {
    const onFly = (p: { id: string; emoji: string; x?: number }) => {
      const x = typeof p.x === 'number' ? Math.min(90, Math.max(5, p.x)) : 10 + Math.random() * 80;
      setItems((l) => capList(l, { id: p.id, emoji: emojiFor(p.emoji), x }));
      window.setTimeout(() => setItems((l) => l.filter((i) => i.id !== p.id)), 3600);
    };
    socket.on('reaction:fly', onFly);
    return () => { socket.off('reaction:fly', onFly); };
  }, [socket]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <AnimatePresence>
        {items.map((i) => (
          <motion.span
            key={i.id} style={{ left: `${i.x}%`, bottom: '10%' }} className="absolute text-4xl will-change-transform"
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={reduce ? { opacity: [0, 1, 0] } : { opacity: [0, 1, 1, 0], y: -420, scale: [0.6, 1.2, 1] }}
            exit={{ opacity: 0 }} transition={{ duration: reduce ? 1.2 : 3.2, ease: 'easeOut' }}
          >{i.emoji}</motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
