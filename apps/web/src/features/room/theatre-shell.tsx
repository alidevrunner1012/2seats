'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, Copy, ExternalLink, HelpCircle, LayoutTemplate, Maximize2, MessageCircle, Mic, MonitorPlay, Moon, Move, PanelRight, Users, Video, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Rnd } from 'react-rnd';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AuthGate } from '@/features/auth/auth-gate';
import { apiFetch } from '@/lib/api-client';
import { springs } from '@/lib/motion';
import { useRoomLayoutStore, persistRoomLayout, type LayoutPreset, type PanelId, type PanelRect } from '@/store/room-layout-store';
import { VideoPanel } from './video-panel';
import { ChatPanel } from '@/features/chat/chat-panel';
import { SocketProvider } from '@/features/chat/socket-provider';
import { ScreenPanel } from './screen-panel';
import { ModeSwitcher } from './mode/ModeSwitcher';
import { useModeStore } from './mode/modeStore';
import { BrowserPanel } from './browser/BrowserPanel';
import { ScreenSharePanel } from './screen-share/ScreenSharePanel';
import { ReactionLayer } from './reactions/ReactionLayer';
import { EndOfMovie } from './reactions/EndOfMovie';

interface RoomMember { id: string; displayName: string; avatarUrl: string | null }
interface TheatreRoom { id: string; name: string; inviteCode: string; members: RoomMember[]; everyoneCanControl?: boolean }
interface TheatreProps { roomId: string; initialRoom?: TheatreRoom }

const panelMeta: Record<PanelId, { label: string; icon: typeof MonitorPlay }> = {
  screen: { label: 'Screen', icon: MonitorPlay },
  video: { label: 'Video', icon: Video },
  chat: { label: 'Chat', icon: MessageCircle },
};
const presets: Array<{ value: LayoutPreset; label: string }> = [
  { value: 'cinema', label: 'Cinema' }, { value: 'side-by-side', label: 'Side-by-side' },
  { value: 'faces', label: 'Focus on faces' }, { value: 'chat-heavy', label: 'Chat heavy' },
];

export function TheatreShell({ roomId, initialRoom }: TheatreProps): JSX.Element {
  return <AuthGate><SocketProvider><TheatreContent roomId={roomId} initialRoom={initialRoom} /></SocketProvider></AuthGate>;
}

function TheatreContent({ roomId, initialRoom }: TheatreProps): JSX.Element {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [room, setRoom] = useState(initialRoom);
  const [mobileTab, setMobileTab] = useState<PanelId>('screen');
  const [helpOpen, setHelpOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [latency, setLatency] = useState(42);
  const state = useRoomLayoutStore();
  useEffect(() => {
    state.hydrate();
    if (room === undefined) void apiFetch<TheatreRoom>(`/rooms/${roomId}`).then(setRoom).catch(() => router.replace('/dashboard'));
  }, [room, roomId, router, state]);
  useEffect(() => {
    if (!state.hydrated) return;
    persistRoomLayout(state);
  }, [state]);
  useEffect(() => {
    const timer = window.setInterval(() => setLatency(36 + Math.floor(Math.random() * 24)), 4000);
    return () => window.clearInterval(timer);
  }, []);

  const copyInvite = async (): Promise<void> => {
    const link = `${window.location.origin}/join/${room?.inviteCode ?? roomId}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const leave = (): void => { setLeaveOpen(false); router.push('/dashboard'); };
  const openPanels = useMemo(() => Object.entries(state.panels).filter(([, panel]) => panel.open) as Array<[PanelId, PanelRect]>, [state.panels]);

  return (
    <main className={`theatre-shell ${state.dimLights ? 'theatre-dim' : ''}`}>
      <div className="theatre-ambient" aria-hidden="true" />
      <header className="theatre-topbar">
        <div className="flex min-w-0 items-center gap-3">
          <button className="theatre-back" onClick={() => router.push('/dashboard')} aria-label="Back to dashboard">2S</button>
          <div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.3em] text-blush/70">Date room</p><h1 className="truncate font-display text-lg text-cream">{room?.name ?? 'Your theatre'}</h1></div>
        </div>
        <div className="hidden items-center gap-3 md:flex">
        <ModeSwitcher />
          <div className="flex -space-x-2">{room?.members.map((member) => <Avatar key={member.id} className="size-8"><AvatarImage src={member.avatarUrl ?? undefined} alt="" /><AvatarFallback>{member.displayName.slice(0, 1)}</AvatarFallback></Avatar>)}</div>
          <span className="text-xs text-cream/55"><span className="mr-1 inline-block size-2 rounded-full bg-emerald-400" />{latency}ms</span>
          <Button variant="glass" size="sm" onClick={() => void copyInvite()}><Copy className="size-4" />{copied ? 'Copied' : 'Invite'}</Button>
          <Button variant="ghost" size="sm" onClick={() => setHelpOpen(true)} aria-label="Keyboard shortcuts"><HelpCircle className="size-4" /></Button>
          <Button variant="ghost" size="sm" className="border border-rose/30 text-blush" onClick={() => setLeaveOpen(true)}>Leave</Button>
        </div>
        <div className="flex items-center gap-2 md:hidden"><button className="theatre-icon-button" onClick={() => void copyInvite()} aria-label="Copy invite"><Copy className="size-4" /></button><button className="theatre-icon-button" onClick={() => setLeaveOpen(true)} aria-label="Leave room"><X className="size-4" /></button></div>
      </header>
      <section className="theatre-canvas" aria-label="Theatre room">
        <AnimatePresence mode="popLayout">
          {openPanels.map(([id, panel]) => {
            const Meta = panelMeta[id];
            const Icon = Meta.icon;
            return <Rnd key={id} bounds="parent" minWidth={240} minHeight={150} maxWidth={1200} maxHeight={800} size={{ width: panel.width, height: panel.height }} position={{ x: panel.x, y: panel.y }} onMouseDown={() => state.focus(id)} onDragStop={(_, data) => { state.setPanel(id, { x: data.x, y: data.y }); state.snap(id, { width: window.innerWidth, height: window.innerHeight - 80 }); }} onResizeStop={(_, __, ref, ___, position) => state.setPanel(id, { width: ref.offsetWidth, height: ref.offsetHeight, x: position.x, y: position.y })} className={`theatre-panel panel-${id}`} style={{ zIndex: panel.z }}>
              <motion.div initial={{ opacity: 0, scale: reduced ? 1 : 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reduced ? 1 : 0.94 }} transition={springs.dialog} className="flex h-full flex-col overflow-hidden rounded-2xl">
                <div className="theatre-panel-head"><span className="flex items-center gap-2"><Move className="size-3 text-cream/30" /><Icon className="size-4 text-blush" />{Meta.label}</span><div className="flex items-center gap-1"><button onClick={() => state.togglePanel(id)} aria-label={`Close ${Meta.label}`} className="theatre-panel-action"><X className="size-3.5" /></button></div></div>
                <div className="theatre-panel-body">{id === 'screen' ? <ModeContent roomId={roomId} canControl={room?.everyoneCanControl ?? true} /> : id === 'video' ? <VideoPanel roomId={roomId} roomName={room?.name ?? 'Your theatre'} /> : <ChatPanel roomId={roomId} />}</div>
              </motion.div>
            </Rnd>;
          })}
        </AnimatePresence>
      </section>
      <nav className="theatre-controls" aria-label="Theatre controls">
        <div className="flex items-center gap-2"><LayoutTemplate className="size-4 text-candle" /><select aria-label="Layout preset" value={state.preset} onChange={(event) => state.setPreset(event.target.value as LayoutPreset)}>{presets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}</select></div>
        <div className="hidden items-center gap-1 sm:flex">{(['screen', 'video', 'chat'] as PanelId[]).map((id) => <button key={id} className={`theatre-control-button ${state.panels[id].open ? 'active' : ''}`} onClick={() => state.togglePanel(id)}>{panelMeta[id].label}</button>)}</div>
        <button className={`theatre-control-button ${state.dimLights ? 'active' : ''}`} onClick={state.toggleDimLights}><Moon className="size-4" /> Dim lights</button>
      </nav>
      <ReactionLayer />
      <EndOfMovie />
      <nav className="theatre-mobile-tabs" aria-label="Mobile panels">{(['screen', 'video', 'chat'] as PanelId[]).map((id) => <button key={id} className={mobileTab === id ? 'active' : ''} onClick={() => setMobileTab(id)}>{panelMeta[id].label}</button>)}</nav>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent><DialogTitle>Shortcuts for two</DialogTitle><DialogDescription>Keep your hands free for popcorn.</DialogDescription><div className="mt-5 grid gap-2 text-sm text-cream/70">{[['Space', 'Play / pause'], ['F', 'Focus screen'], ['M', 'Mute microphone'], ['V', 'Toggle camera'], ['C', 'Open chat'], ['Arrow keys', 'Nudge focused panel']].map(([key, label]) => <div key={key} className="flex justify-between rounded-xl bg-white/5 px-3 py-2"><kbd className="text-blush">{key}</kbd><span>{label}</span></div>)}</div></DialogContent></Dialog>
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}><DialogContent><DialogTitle>Leave this little theatre?</DialogTitle><DialogDescription>Your room will still be here, whenever you’re ready to come back.</DialogDescription><div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setLeaveOpen(false)}>Stay a little</Button><Button variant="ghost" className="border border-rose/30 text-blush" onClick={leave}>Leave room</Button></div></DialogContent></Dialog>
    </main>
  );
}

function ModeContent({ roomId, canControl }: { roomId: string; canControl: boolean }): JSX.Element {
  const mode = useModeStore((current) => current.mode);
  if (mode === 'screen') return <ScreenSharePanel />;
  if (mode === 'browser') return <BrowserPanel />;
  return <ScreenPanel roomId={roomId} canControl={canControl} />;
}
