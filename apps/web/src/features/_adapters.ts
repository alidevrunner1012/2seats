/**
 * ONE place that connects the new components to YOUR existing web code. Fix these imports/exports.
 * Expected shapes:
 *  - useSocket(): socket.io-client `Socket` (your F8 socket provider)
 *  - apiFetch<T>(path, { method?, body? }): your typed fetch wrapper (adds auth + refresh)
 *  - useCurrentUserId(): string | null
 *  - useRoomId(): string  (from the route params)
 */
import type { Socket } from 'socket.io-client';
import { useChatSocket } from './chat/socket-provider';
export { apiFetch } from '../lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useParams } from 'next/navigation';

export function useSocket(): Socket {
  const socket = useChatSocket();
  if (socket === null) throw new Error('SocketProvider is required for room controls');
  return socket as unknown as Socket;
}

export function useCurrentUserId(): string | null {
  return useAuthStore((state) => state.user?.id ?? null);
}
export function useRoomId(): string {
  const params = useParams<{ id: string }>();
  return params.id;
}
