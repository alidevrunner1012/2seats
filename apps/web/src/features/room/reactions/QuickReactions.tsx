'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRoomId, useSocket } from '../../_adapters';
import { BigBurst } from './BigBurst';
import { REACTIONS, makeThrottle } from './reactions';

export function QuickReactions() {
  const socket = useSocket();
  const roomId = useRoomId();
  const [burst, setBurst] = useState<{ key: number; emoji: string }>({ key: 0, emoji: '❤️' });
  const [holding, setHolding] = useState(false);
  const canSend = useMemo(() => makeThrottle(250), []);

  useEffect(() => {
    // Server emits these when BOTH people act within ~1 second.
    const hands = () => setBurst((b) => ({ key: b.key + 1, emoji: '🤝' }));
    const beat = () => setBurst((b) => ({ key: b.key + 1, emoji: '❤️' }));
    socket.on('reaction:hands-joined', hands);
    socket.on('reaction:heartbeat-sync', beat);
    return () => { socket.off('reaction:hands-joined', hands); socket.off('reaction:heartbeat-sync', beat); };
  }, [socket]);

  const send = (emoji: string) => { if (canSend()) socket.emit('reaction:send', { roomId, emoji }); };
  const press = () => { setHolding(true); socket.emit('reaction:hand-press', { roomId }); };
  const release = () => { if (holding) { setHolding(false); socket.emit('reaction:hand-release', { roomId }); } };

  return (
    <>
      <div className="glass flex items-center gap-1 rounded-full p-1" role="group" aria-label="Reactions">
        {REACTIONS.map((r) => (
          <button key={r.id} aria-label={r.label} onClick={() => send(r.id)}
            className="rounded-full px-2.5 py-1 text-xl transition-transform hover:-translate-y-0.5 active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFB86B]">
            {r.emoji}
          </button>
        ))}
        <button
          aria-label="Hold my hand: press and hold together" aria-pressed={holding}
          onPointerDown={press} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
          onKeyDown={(e) => { if (e.key === ' ' && !e.repeat) { e.preventDefault(); press(); } }}
          onKeyUp={(e) => { if (e.key === ' ') release(); }}
          className={`rounded-full px-3 py-1 text-sm font-semibold transition ${holding ? 'bg-[#FFB86B] text-[#1A0B14] shadow-[0_0_24px_#FFB86B]' : 'bg-white/10'}`}
        >
          🤝 Hold hands
        </button>
      </div>
      <BigBurst burstKey={burst.key} emoji={burst.emoji} />
    </>
  );
}
