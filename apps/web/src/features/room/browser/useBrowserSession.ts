'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, useRoomId } from '../../_adapters';

export type BrowserSessionView =
  | { status: 'idle' }
  | { status: 'queued'; position: number }
  | { status: 'starting'; sessionId: string; expiresAt: string }
  | { status: 'running'; sessionId: string; expiresAt: string; sessionUrl: string; controlToken: string };

export function useBrowserSession() {
  const roomId = useRoomId();
  const qc = useQueryClient();
  const key = ['browser-session', roomId];
  const base = `/rooms/${roomId}/browser-session`;

  const query = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<BrowserSessionView>(base),
    retry: false,
    // poll while waiting in the queue or while the container boots
    refetchInterval: (q) => (q.state.data && ['queued', 'starting'].includes(q.state.data.status) ? 2000 : false),
  });
  const set = (v: BrowserSessionView) => qc.setQueryData(key, v);

  const start = useMutation({ mutationFn: () => apiFetch<BrowserSessionView>(base, { method: 'POST' }), onSuccess: set });
  const stop = useMutation({
    mutationFn: () => apiFetch<{ ok: true }>(base, { method: 'DELETE' }),
    onSuccess: () => set({ status: 'idle' }),
  });
  const extend = useMutation({
    mutationFn: () => apiFetch<{ expiresAt: string }>(`${base}/extend`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return { query, view: query.data ?? ({ status: 'idle' } as BrowserSessionView), start, stop, extend };
}
