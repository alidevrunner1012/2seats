'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock3, Loader2, RotateCcw, Send, Smile } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '../../../../../packages/shared/src/index';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useChatSocket } from './socket-provider';

type LocalMessage = ChatMessage & { state?: 'sending' | 'failed'; clientId?: string };
const emojis = ['❤️', '🍿', '😂', '🥹'];

export function ChatPanel({ roomId }: { roomId: string }): JSX.Element {
  const socket = useChatSocket();
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread] = useState(0);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const load = useCallback(async (nextCursor?: string): Promise<void> => {
    setLoadingMore(true);
    try {
      const result = await apiFetch<{ items: ChatMessage[]; nextCursor: string | null }>(`/rooms/${roomId}/messages?limit=30${nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ''}`);
      setMessages((current) => nextCursor ? [...result.items, ...current] : result.items);
      setCursor(result.nextCursor ?? undefined);
    } finally { setLoadingMore(false); }
  }, [roomId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (socket === null) return;
    const join = (response: { ok: boolean }): void => { if (!response.ok) setTyping(false); };
    const onMessage = (message: ChatMessage): void => {
      setMessages((current) => {
        const optimistic = current.find((item) => item.clientId && item.content === message.content && item.senderId === message.senderId);
        if (optimistic) return current.map((item) => item === optimistic ? { ...message } : item);
        return [...current, message];
      });
      if (message.senderId !== user?.id && collapsed) setUnread((value) => value + 1);
    };
    const onTyping = (payload: { userId?: string; isTyping: boolean }): void => { if (payload.userId !== user?.id) setTyping(payload.isTyping); };
    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    const reconnect = (): void => { socket.emit('room:join', { roomId }, join); void load(); };
    socket.emit('room:join', { roomId }, join);
    socket.on('connect', reconnect);
    return () => { socket.off('chat:message', onMessage); socket.off('chat:typing', onTyping); socket.off('connect', reconnect); };
  }, [collapsed, load, roomId, socket, user?.id]);
  useEffect(() => {
    if (stickToBottom.current && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, typing]);

  const send = (content = draft): void => {
    const clean = content.replace(/<[^>]*>/g, '').trim();
    if (!clean || socket === null || user === null) return;
    const clientId = crypto.randomUUID();
    const optimistic: LocalMessage = { id: clientId, clientId, roomId, senderId: user.id, senderName: user.displayName, content: clean, createdAt: new Date().toISOString(), state: 'sending' };
    setMessages((current) => [...current, optimistic]); setDraft('');
    socket.emit('chat:send', { roomId, content: clean }, (response: { ok: boolean; error?: string }) => {
      setMessages((current) => current.map((item) => item.clientId === clientId ? { ...item, state: response.ok ? undefined : 'failed' } : item));
    });
  };
  const retry = (message: LocalMessage): void => { setMessages((current) => current.filter((item) => item.clientId !== message.clientId)); send(message.content); };
  const onScroll = (): void => { const element = listRef.current; if (!element) return; stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; };
  const visible = useMemo(() => messages.slice(-80), [messages]);

  return <section className={`chat-panel ${collapsed ? 'is-collapsed' : ''}`} aria-label="Room chat">
    <header className="chat-panel-header"><span className="font-display text-base text-cream">A little room for sweet nothings</span><div className="flex items-center gap-1">{collapsed && unread > 0 && <span className="chat-unread">{unread}</span>}<button className="chat-icon" onClick={() => { setCollapsed((value) => !value); setUnread(0); }} aria-label={collapsed ? 'Expand chat' : 'Collapse chat'}>{collapsed ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</button></div></header>
    {!collapsed && <><div ref={listRef} onScroll={onScroll} className="chat-message-list" role="log" aria-live="polite">{cursor && <button className="chat-load-more" onClick={() => void load(cursor)} disabled={loadingMore}>{loadingMore ? <Loader2 className="size-3 animate-spin" /> : <ChevronUp className="size-3" />} Older messages</button>}{visible.map((message) => <MessageRow key={message.clientId ?? message.id} message={message} mine={message.senderId === user?.id} onRetry={() => retry(message)} />)}{typing && <div className="chat-typing"><span /><span /><span /> Someone is typing…</div>}</div><div className="chat-compose"><div className="relative flex-1"><input value={draft} onChange={(event) => { setDraft(event.target.value); socket?.emit('chat:typing', { roomId, isTyping: event.target.value.length > 0 }); }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Say something soft…" aria-label="Message" maxLength={2000} />{emojiOpen && <div className="chat-emoji-picker">{emojis.map((emoji) => <button key={emoji} onClick={() => { setDraft((value) => `${value}${emoji}`); setEmojiOpen(false); }}>{emoji}</button>)}</div>}</div><button className="chat-compose-button" onClick={() => setEmojiOpen((value) => !value)} aria-label="Add emoji"><Smile className="size-4" /></button><button className="chat-compose-button" onClick={() => send()} aria-label="Send message" disabled={!draft.trim()}><Send className="size-4" /></button></div></>}
  </section>;
}

function MessageRow({ message, mine, onRetry }: { message: LocalMessage; mine: boolean; onRetry: () => void }): JSX.Element {
  const [reactions, setReactions] = useState<string[]>([]);
  return <motion.div initial={{ opacity: 0, x: mine ? 14 : -14 }} animate={{ opacity: 1, x: 0 }} className={`chat-message-row ${mine ? 'mine' : ''}`}><div className={`chat-bubble ${mine ? 'mine' : ''}`}><div className="chat-message-meta">{mine ? 'You' : message.senderName} · <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div><p>{message.content}</p>{message.linkUrl && <a className="chat-link-preview" href={message.linkUrl} target="_blank" rel="noreferrer"><strong>{message.linkTitle ?? message.linkUrl}</strong>{message.linkDescription && <span>{message.linkDescription}</span>}</a>}{message.state === 'sending' && <span className="chat-state"><Clock3 className="size-3" /> Sending</span>}{message.state === 'failed' && <button className="chat-state failed" onClick={onRetry}><RotateCcw className="size-3" /> Failed · retry</button>}<div className="chat-reactions">{reactions.map((reaction) => <span key={reaction}>{reaction}</span>)}<button aria-label="React with heart" onClick={() => setReactions((current) => [...current, '❤️'])}>♡</button></div></div></motion.div>;
}
