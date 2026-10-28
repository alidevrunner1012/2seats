'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useRoomId, useSocket } from '../../_adapters';
import { ROOM_MODES, RoomMode, useModeStore } from './modeStore';

export function ModeSwitcher() {
  const socket = useSocket();
  const roomId = useRoomId();
  const { mode, setMode, applyRemote } = useModeStore();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onState = (s: { mode?: unknown; version?: number }) => { applyRemote(s.mode); if (typeof s.version === 'number') setVersion(s.version); };
    socket.on('player:state', onState);
    return () => { socket.off('player:state', onState); };
  }, [socket, applyRemote]);

  const choose = (next: RoomMode) => {
    if (next === mode) return;
    const prev = mode;
    setMode(next); // optimistic
    socket.emit('room:set-mode', { roomId, mode: next, baseVersion: version }, (ack: { ok: boolean }) => { if (!ack?.ok) setMode(prev); });
  };

  return (
    <div role="tablist" aria-label="What are we watching with?" className="glass relative flex gap-1 rounded-full p-1">
      {ROOM_MODES.map((m) => (
        <button
          key={m.id} role="tab" aria-selected={mode === m.id} data-testid={`room-mode-tab-${m.id}`}
          onClick={() => choose(m.id)}
          className="relative rounded-full px-4 py-1.5 text-sm text-[#FFF4EC] outline-none focus-visible:ring-2 focus-visible:ring-[#FFB86B]"
        >
          {mode === m.id && (
            <motion.span layoutId="mode-underline" className="absolute inset-0 -z-10 rounded-full bg-[#E8466C]/80"
              transition={{ type: 'spring', stiffness: 420, damping: 32 }} />
          )}
          {m.label}
        </button>
      ))}
    </div>
  );
}
