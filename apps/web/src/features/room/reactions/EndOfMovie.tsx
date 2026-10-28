'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { apiFetch, useRoomId, useSocket } from '../../_adapters';
import { nextWeekLocal } from './date';

export function EndOfMovie() {
  const socket = useSocket();
  const roomId = useRoomId();
  const [ended, setEnded] = useState<{ title?: string } | null>(null);
  const [when, setWhen] = useState(nextWeekLocal());
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const onEnd = (p: { title?: string }) => { setEnded(p ?? {}); setWhen(nextWeekLocal()); setState('idle'); };
    socket.on('room:movie-ended', onEnd);
    return () => { socket.off('room:movie-ended', onEnd); };
  }, [socket]);

  async function schedule() {
    setState('saving');
    try {
      await apiFetch(`/rooms/${roomId}/dates`, { method: 'POST', body: { scheduledFor: new Date(when).toISOString(), note: 'Movie date' } });
      setState('saved');
    } catch { setState('error'); }
  }

  return (
    <AnimatePresence>
      {ended && (
        <motion.div role="dialog" aria-modal="true" aria-label="Movie finished"
          className="fixed inset-0 z-[80] grid place-items-center bg-[#1A0B14]/85 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="glass w-full max-w-md rounded-3xl p-7 text-center"
            initial={{ y: 24, scale: 0.96 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
            <p className="text-4xl" aria-hidden>🍿❤️</p>
            <h2 className="mt-2 font-serif text-3xl text-[#FFF4EC]">That was lovely.</h2>
            <p className="mt-1 text-[#FFB3C6]">{ended.title ? `“${ended.title}” is saved to Movies we watched.` : 'Saved to Movies we watched.'}</p>
            <p className="mt-5 font-serif text-xl text-[#FFF4EC]">Same time next week?</p>
            <label className="mt-3 block text-left text-sm text-[#FFB3C6]">
              Date and time
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
                className="mt-1 w-full rounded-xl bg-[#3B0F26] px-3 py-2 text-[#FFF4EC]" />
            </label>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={schedule} disabled={state === 'saving' || state === 'saved'}
                className="rounded-full bg-[#E8466C] px-6 py-2.5 font-semibold disabled:opacity-60">
                {state === 'saved' ? 'Scheduled ♥' : state === 'saving' ? 'Saving…' : 'Schedule next date'}
              </button>
              <button onClick={() => setEnded(null)} className="rounded-full bg-white/10 px-5 py-2.5">Close</button>
            </div>
            {state === 'error' && <p role="alert" className="mt-3 text-sm text-[#FFB86B]">Could not save. Please try again.</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
