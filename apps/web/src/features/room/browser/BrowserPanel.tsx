'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserSessionView, useBrowserSession } from './useBrowserSession';
import { useBrowserControl } from './useBrowserControl';
import { formatRemaining, isExpiringSoon } from './time';

function useRemaining(expiresAt?: string) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setMs(new Date(expiresAt).getTime() - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);
  return ms;
}

export function BrowserPanel() {
  const { view, query, start, stop, extend } = useBrowserSession();
  const control = useBrowserControl();
  const frame = useRef<HTMLIFrameElement>(null);
  const remaining = useRemaining('expiresAt' in view ? view.expiresAt : undefined);
  const err = (start.error ?? extend.error ?? stop.error ?? query.error) as { message?: string; status?: number } | null;

  const fullscreen = async () => { try { await frame.current?.requestFullscreen(); } catch { /* denied: ignore */ } };

  if (view.status === 'idle') return <Idle onStart={() => start.mutate()} busy={start.isPending} error={err?.message} />;
  if (view.status === 'queued') return <Waiting title="You are in the queue" detail={`Position ${view.position}. We will open it as soon as a browser is free.`} />;
  if (view.status === 'starting') return <Waiting title="Opening the browser…" detail="This takes about 20 seconds." />;
  const running = view as Extract<BrowserSessionView, { status: 'running' }>;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="relative flex-1 overflow-hidden rounded-2xl bg-black">
        <iframe
          ref={frame} src={running.sessionUrl} title="Shared browser"
          className={`h-full w-full ${control.role === 'other' ? 'pointer-events-none' : ''}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
          allow="autoplay; fullscreen; clipboard-read; clipboard-write"
          referrerPolicy="no-referrer"
        />
        {control.role === 'other' && (
          <div className="absolute inset-x-0 top-0 bg-[#3B0F26]/80 py-1 text-center text-xs text-[#FFB3C6]">
            Your partner is driving. Ask for control to click around.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {control.role === 'me' ? (
          <button onClick={control.release} className="rounded-full bg-white/10 px-4 py-1.5">Give control</button>
        ) : (
          <button onClick={control.request} className="rounded-full bg-[#E8466C] px-4 py-1.5 font-semibold">
            {control.state.pendingFrom ? 'Requested…' : 'Take control'}
          </button>
        )}
        {control.incoming && (
          <button onClick={control.grantToPending} className="rounded-full bg-[#FFB86B] px-4 py-1.5 font-semibold text-[#1A0B14]" aria-live="polite">
            They want control: hand over
          </button>
        )}
        <span className={isExpiringSoon(remaining) ? 'text-[#FFB86B]' : 'text-[#FFB3C6]'} aria-live="off">
          Session {formatRemaining(remaining)}
        </span>
        <button onClick={() => extend.mutate()} disabled={extend.isPending} className="rounded-full bg-white/10 px-3 py-1.5">+15 min</button>
        <button onClick={fullscreen} className="rounded-full bg-white/10 px-3 py-1.5">Fullscreen</button>
        <button onClick={() => stop.mutate()} className="ml-auto rounded-full bg-white/10 px-3 py-1.5 text-[#FFB3C6]">Stop</button>
      </div>
      {err?.message && <p role="alert" className="text-sm text-[#FFB86B]">{err.message}</p>}
      <p className="text-xs text-[#FFB3C6]/70">Netflix and similar sites may appear black here. Use Screen share for those.</p>
    </div>
  );
}

function Idle({ onStart, busy, error }: { onStart: () => void; busy: boolean; error?: string }) {
  return (
    <div className="glass grid h-full place-items-center p-6 text-center">
      <div>
        <h3 className="font-serif text-2xl text-[#FFF4EC]">Browse the internet together</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#FFB3C6]">We open one browser for both of you. Search, scroll, play anything, side by side.</p>
        <button onClick={onStart} disabled={busy} className="mt-4 rounded-full bg-[#E8466C] px-6 py-2.5 font-semibold disabled:opacity-50">
          {busy ? 'Opening…' : 'Start shared browser'}
        </button>
        {error && <p role="alert" className="mt-3 text-sm text-[#FFB86B]">{error}</p>}
      </div>
    </div>
  );
}
function Waiting({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="glass grid h-full place-items-center p-6 text-center" role="status" aria-live="polite">
      <div>
        <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-full bg-[#E8466C]" aria-hidden />
        <p className="font-serif text-xl text-[#FFF4EC]">{title}</p>
        <p className="mt-1 text-sm text-[#FFB3C6]">{detail}</p>
      </div>
    </div>
  );
}
