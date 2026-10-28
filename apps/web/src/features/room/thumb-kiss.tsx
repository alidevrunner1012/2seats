'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useChatSocket } from '@/features/chat/socket-provider';

export function ThumbKiss({ roomId }: { roomId: string }): JSX.Element {
  const socket = useChatSocket();
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const [kissing, setKissing] = useState(false);

  useEffect(() => {
    if (socket === null) return;
    const start = (payload: { roomId: string }): void => {
      if (payload.roomId === roomId) setKissing(true);
    };
    const end = (payload: { roomId: string }): void => {
      if (payload.roomId === roomId) setKissing(false);
    };
    socket.on('reaction:thumb-kiss-start', start);
    socket.on('reaction:thumb-kiss-end', end);
    return () => {
      socket.off('reaction:thumb-kiss-start', start);
      socket.off('reaction:thumb-kiss-end', end);
    };
  }, [roomId, socket]);

  const setHolding = (next: boolean): void => {
    if (socket === null || pressed === next) return;
    setPressed(next);
    socket.emit(
      next ? 'reaction:thumb-kiss-start' : 'reaction:thumb-kiss-end',
      { roomId },
    );
  };

  return (
    <div className="thumb-kiss-control" aria-live="polite">
      <motion.button
        type="button"
        aria-label="Press and hold to kiss thumbs"
        aria-pressed={pressed}
        onPointerDown={() => setHolding(true)}
        onPointerUp={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
        onKeyDown={(event) => {
          if (event.key === ' ' && !event.repeat) {
            event.preventDefault();
            setHolding(true);
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ') setHolding(false);
        }}
        animate={kissing && !reduced ? { scale: [1, 1.06, 1], rotate: [0, -2, 2, 0] } : { scale: 1, rotate: 0 }}
        transition={kissing && !reduced ? { duration: 0.32, repeat: Infinity } : { duration: 0.18 }}
        className={`thumb-kiss-button ${kissing ? 'is-kissing' : ''} ${pressed ? 'is-pressed' : ''}`}
      >
        <span aria-hidden="true">🤞</span>
        <span>{kissing ? 'Thumbs are kissing' : 'Kiss thumbs'}</span>
      </motion.button>
      {kissing && <span className="thumb-kiss-status">A tiny spark between you two</span>}
    </div>
  );
}
