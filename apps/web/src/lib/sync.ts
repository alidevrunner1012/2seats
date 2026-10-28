'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaybackState } from '../../../../packages/shared/src/index';

export type DriftAction =
  | { kind: 'none'; drift: number }
  | { kind: 'rate'; drift: number; playbackRate: 0.95 | 1.05 }
  | { kind: 'seek'; drift: number; position: number };

export function getPlaybackSourceType(value: string): 'url' | 'youtube' | 'vimeo' | 'hls' | 'dash' | null {
  try {
    const parsed = new URL(value);
    const path = parsed.pathname.toLowerCase();
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.hostname.includes('youtube.com') || parsed.hostname === 'youtu.be') return 'youtube';
    if (parsed.hostname.includes('vimeo.com')) return 'vimeo';
    if (path.endsWith('.m3u8')) return 'hls';
    if (path.endsWith('.mpd')) return 'dash';
    if (/\.(mp4|webm|ogg)$/i.test(path)) return 'url';
    return null;
  } catch {
    return null;
  }
}

export function calculateDrift(
  state: Pick<PlaybackState, 'position' | 'rate' | 'status' | 'updatedAt'>,
  serverNow: number,
  localPosition: number,
): DriftAction {
  const expected = state.status === 'playing'
    ? state.position + ((serverNow - state.updatedAt) / 1_000) * state.rate
    : state.position;
  const drift = expected - localPosition;
  const absolute = Math.abs(drift);
  if (absolute <= 0.3) return { kind: 'none', drift };
  if (absolute > 1.5) return { kind: 'seek', drift, position: Math.max(0, expected) };
  return { kind: 'rate', drift, playbackRate: drift > 0 ? 1.05 : 0.95 };
}

type PingSocket = { emit: (event: 'time:ping', ack: (payload: { serverTime: number }) => void) => void };

export function useServerClock(socket: PingSocket | null): number {
  const [offset, setOffset] = useState(0);
  const samples = useRef<number[]>([]);
  const ping = useCallback(() => {
    if (socket === null) return;
    const sent = Date.now();
    socket.emit('time:ping', ({ serverTime }) => {
      const received = Date.now();
      samples.current = [...samples.current, serverTime - (sent + (received - sent) / 2)].slice(-5);
      const sorted = [...samples.current].sort((a, b) => a - b);
      const middle = sorted[Math.floor(sorted.length / 2)];
      if (middle !== undefined) setOffset(middle);
    });
  }, [socket]);
  useEffect(() => {
    ping();
    const timer = window.setInterval(ping, 30_000);
    return () => window.clearInterval(timer);
  }, [ping]);
  return Date.now() + offset;
}

export function useSyncedPlayer(
  socket: PingSocket | null,
  state: PlaybackState | null,
  media: HTMLMediaElement | null,
): { autoplayBlocked: boolean; clearAutoplayBlocked: () => void } {
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const latestVersion = useRef(-1);
  const serverNow = useServerClock(socket);
  useEffect(() => {
    if (state === null || media === null || state.version < latestVersion.current) return;
    latestVersion.current = state.version;
    const action = calculateDrift(state, serverNow, media.currentTime);
    if (action.kind === 'seek' && Math.abs(media.currentTime - action.position) > 0.15) media.currentTime = action.position;
    media.playbackRate = action.kind === 'rate' ? action.playbackRate : state.rate;
    if (state.status === 'playing') {
      void media.play().catch(() => setAutoplayBlocked(true));
    } else {
      media.pause();
    }
  }, [media, serverNow, state]);
  const clearAutoplayBlocked = useCallback(() => setAutoplayBlocked(false), []);
  return { autoplayBlocked, clearAutoplayBlocked };
}
