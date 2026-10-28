'use client';

import { io, type Socket } from 'socket.io-client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ChatMessage, PlaybackState, SocketAck } from '../../../../../packages/shared/src/index';
import { env } from '@/lib/env';
import { useAuthStore } from '@/store/auth-store';

type ChatSocketEvents = {
  'chat:message': (message: ChatMessage) => void;
  'chat:typing': (payload: { userId?: string; isTyping: boolean }) => void;
  'chat:message-updated': (message: ChatMessage) => void;
  'chat:message-deleted': (payload: { roomId: string; messageId: string }) => void;
  'player:state': (state: PlaybackState & { serverTime?: number }) => void;
  'playback:toast': (payload: { userId?: string; action?: string }) => void;
};
type ChatSocketCommands = {
  'room:join': (payload: { roomId: string }, ack: (response: SocketAck) => void) => void;
  'chat:send': (payload: { roomId: string; content: string }, ack: (response: SocketAck) => void) => void;
  'chat:typing': (payload: { roomId: string; isTyping: boolean }) => void;
  'time:ping': (ack: (payload: { serverTime: number }) => void) => void;
  'player:set-source': (payload: unknown, ack: (response: SocketAck) => void) => void;
  'player:play': (payload: unknown, ack: (response: SocketAck) => void) => void;
  'player:pause': (payload: unknown, ack: (response: SocketAck) => void) => void;
  'player:seek': (payload: unknown, ack: (response: SocketAck) => void) => void;
  'player:rate': (payload: unknown, ack: (response: SocketAck) => void) => void;
  'room:set-mode': (payload: unknown, ack: (response: SocketAck) => void) => void;
};
type ChatSocket = Socket<ChatSocketEvents, ChatSocketCommands>;
const SocketContext = createContext<ChatSocket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const token = useAuthStore((state) => state.accessToken);
  const [socket, setSocket] = useState<ChatSocket | null>(null);
  useEffect(() => {
    if (token === null) return;
    const client = io(`${env.NEXT_PUBLIC_API_URL}/socket`, { auth: { token }, autoConnect: true, reconnection: true }) as ChatSocket;
    setSocket(client);
    return () => { client.disconnect(); setSocket(null); };
  }, [token]);
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useChatSocket(): ChatSocket | null { return useContext(SocketContext); }
export type ChatSendAck = SocketAck;
export type ChatSocketApi = {
  send: (payload: { roomId: string; content: string }, ack: (response: SocketAck) => void) => void;
  typing: (payload: { roomId: string; isTyping: boolean }) => void;
  join: (roomId: string, ack: (response: SocketAck) => void) => void;
};
