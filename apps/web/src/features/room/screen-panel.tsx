'use client';

import ReactPlayer from 'react-player';
import { Maximize, Pause, Play, RotateCcw, Send, Settings2, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaybackState, SocketAck } from '../../../../../packages/shared/src/index';
import { useChatSocket } from '@/features/chat/socket-provider';
import { getPlaybackSourceType, useSyncedPlayer } from '@/lib/sync';

const emptyState: PlaybackState = { mode: 'player', source: null, status: 'paused', position: 0, rate: 1, updatedAt: 0, version: 0 };

export function ScreenPanel({ roomId, canControl }: { roomId: string; canControl: boolean }): JSX.Element {
  const socket = useChatSocket();
  const [state, setState] = useState<PlaybackState>(emptyState);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [volume, setVolume] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [captionUrl, setCaptionUrl] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const { clearAutoplayBlocked } = useSyncedPlayer(socket, state, mediaRef.current);

  useEffect(() => {
    if (socket === null) return;
    const onState = (next: PlaybackState & { serverTime?: number }): void => {
      if (next.version < state.version) return;
      setState(next);
      if (next.source !== null) { setUrl(next.source.url); setTitle(next.source.title); }
    };
    const onAction = (payload: { userId?: string; action?: string }): void => {
      if (payload.action) { setToast(payload.action); window.setTimeout(() => setToast(null), 2200); }
    };
    socket.on('player:state', onState);
    socket.on('playback:toast', onAction);
    return () => { socket.off('player:state', onState); socket.off('playback:toast', onAction); };
  }, [socket, state.version]);

  const mutate = useCallback((event: 'player:play' | 'player:pause' | 'player:seek' | 'player:rate', patch: Record<string, number>): void => {
    if (socket === null || !canControl) return;
    socket.emit(event, { roomId, baseVersion: state.version, ...patch }, (response: SocketAck) => {
      if (!response.ok) setToast(response.error);
    });
  }, [canControl, roomId, socket, state.version]);
  const loadSource = (): void => {
    const type = getPlaybackSourceType(url);
    if (type === null) { setToast('Use a YouTube, Vimeo, mp4, m3u8 or mpd link'); return; }
    if (!canControl) return;
    socket?.emit('player:set-source', { roomId, baseVersion: state.version, source: { type, url, title: title.trim() || 'Movie night' } }, (response: SocketAck) => { if (!response.ok) setToast(response.error); });
  };
  const togglePlay = (): void => {
    if (!canControl) return;
    const playing = state.status === 'playing';
    mutate(playing ? 'player:pause' : 'player:play', {});
  };
  const handlePlay = (): void => {
    void mediaRef.current?.play().catch(() => setAutoplayBlocked(true));
    clearAutoplayBlocked();
  };
  const currentTime = mediaRef.current?.currentTime ?? state.position;

  return <section className="screen-panel" aria-label="Synced player">
    {state.source === null ? <div className="screen-empty"><span className="font-display text-xl text-cream">Choose tonight’s movie</span><div className="screen-source-form"><input aria-label="Movie URL" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="YouTube, Vimeo, mp4, m3u8 or mpd URL" /><input aria-label="Movie title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A title for this lovely night" /><button className="screen-primary-button" onClick={loadSource} disabled={!canControl}><Send className="size-4" /> Add movie</button></div>{!canControl && <small className="text-cream/50">Only the host can control this movie.</small>}</div> : <><div className="screen-stage"><ReactPlayer ref={mediaRef} src={state.source.url} playing={state.status === 'playing'} playbackRate={speed} volume={volume} controls={false} width="100%" height="100%" onPlay={() => setAutoplayBlocked(false)} />{captionUrl && <track kind="subtitles" src={captionUrl} srcLang="en" label="Captions" default />}{autoplayBlocked && <button className="screen-autoplay" onClick={handlePlay}><Play className="size-5" /> Tap to join the movie</button>}</div><div className="screen-controls"><button aria-label={state.status === 'playing' ? 'Pause movie' : 'Play movie'} onClick={togglePlay} disabled={!canControl}>{state.status === 'playing' ? <Pause /> : <Play />}</button><input aria-label="Seek movie" type="range" min="0" max="86400" step="0.1" value={currentTime} onChange={(event) => mutate('player:seek', { position: Number(event.target.value) })} disabled={!canControl} /><button aria-label="Restart movie" onClick={() => mutate('player:seek', { position: 0 })} disabled={!canControl}><RotateCcw /></button><Volume2 /><input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (mediaRef.current) mediaRef.current.volume = next; }} /><label className="screen-file-button">VTT<input type="file" accept=".vtt,text/vtt" onChange={(event) => { const file = event.target.files?.[0]; if (file) setCaptionUrl(URL.createObjectURL(file)); }} /></label><select aria-label="Playback speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select><button aria-label="Fullscreen" onClick={() => void document.querySelector('.screen-stage')?.requestFullscreen()}><Maximize /></button><button aria-label="Playback settings"><Settings2 /></button></div></>}{toast && <div className="screen-toast">{toast}</div>}</section>;
}
