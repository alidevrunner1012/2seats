'use client';
import { useState } from 'react';
import { apiFetch, useCurrentUserId, useRoomId, useSocket } from '../../_adapters';

interface Props {
  isHost: boolean;
  everyoneCanControl: boolean;
  locked: boolean;
  partner?: { id: string; name: string } | null;
}

export function HostControls({ isHost, everyoneCanControl, locked, partner }: Props) {
  const socket = useSocket();
  const roomId = useRoomId();
  const me = useCurrentUserId();
  const [busy, setBusy] = useState(false);
  const [confirmKick, setConfirmKick] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isHost) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch { setError('That did not work. Please try again.'); } finally { setBusy(false); }
  };

  return (
    <section aria-label="Host controls" className="glass w-64 space-y-3 rounded-2xl p-4 text-sm">
      <h3 className="font-serif text-lg text-[#FFF4EC]">Host controls</h3>

      <label className="flex items-center justify-between gap-3">
        <span>Everyone can control playback</span>
        <input type="checkbox" role="switch" checked={everyoneCanControl} disabled={busy}
          onChange={(e) => socket.emit('host:update-settings', { roomId, everyoneCanControl: e.target.checked })} />
      </label>

      <label className="flex items-center justify-between gap-3">
        <span>Lock room</span>
        <input type="checkbox" role="switch" checked={locked} disabled={busy}
          onChange={(e) => run(() => apiFetch(`/rooms/${roomId}/lock`, { method: 'POST', body: { locked: e.target.checked } }))} />
      </label>

      {partner && partner.id !== me && (
        confirmKick ? (
          <div role="alertdialog" aria-label="Confirm remove" className="space-y-2">
            <p>Remove {partner.name} from this room?</p>
            <div className="flex gap-2">
              <button className="rounded-full bg-[#E8466C] px-4 py-1.5" disabled={busy}
                onClick={() => run(async () => { await apiFetch(`/rooms/${roomId}/kick`, { method: 'POST', body: { userId: partner.id } }); setConfirmKick(false); })}>
                Remove
              </button>
              <button className="rounded-full bg-white/10 px-4 py-1.5" onClick={() => setConfirmKick(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="w-full rounded-full bg-white/10 px-4 py-1.5 text-[#FFB3C6]" onClick={() => setConfirmKick(true)}>Remove {partner.name}</button>
        )
      )}
      {error && <p role="alert" className="text-[#FFB86B]">{error}</p>}
    </section>
  );
}
