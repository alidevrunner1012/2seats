'use client';

import { motion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  Copy,
  Mic,
  MicOff,
  MonitorUp,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Video,
  VideoOff,
  Volume2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthGate } from '@/features/auth/auth-gate';
import { apiFetch } from '@/lib/api-client';
import { springs } from '@/lib/motion';
import { useAuthStore } from '@/store/auth-store';

export interface LobbyMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface LobbyRoom {
  id: string;
  name: string;
  inviteCode: string;
  role: 'HOST' | 'PARTICIPANT';
  createdAt: string;
  members: LobbyMember[];
  lastMovieTitle: string | null;
}

interface DeviceState {
  cameraId: string;
  microphoneId: string;
}

interface LobbyProps {
  roomId: string;
  initialRoom?: LobbyRoom;
}

const DEVICE_KEY = '2seats:devices';

function browserPermissionSteps(): string {
  const agent = navigator.userAgent;
  if (/Firefox/i.test(agent)) return 'Firefox: click the camera icon beside the address bar, allow access, then try again.';
  if (/Safari/i.test(agent) && !/Chrome/i.test(agent)) return 'Safari: open Settings for This Website, set Camera and Microphone to Allow, then try again.';
  return 'Chrome: select Allow in the address bar for camera and microphone, then try again.';
}

function readDevices(): DeviceState {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(DEVICE_KEY) ?? '{}');
    if (typeof saved === 'object' && saved !== null) {
      const state = saved as Partial<DeviceState>;
      return {
        cameraId: typeof state.cameraId === 'string' ? state.cameraId : '',
        microphoneId: typeof state.microphoneId === 'string' ? state.microphoneId : '',
      };
    }
  } catch (error) {
    console.error('Unable to restore media device preferences.', error);
  }
  return { cameraId: '', microphoneId: '' };
}

export function Lobby({ roomId, initialRoom }: LobbyProps): JSX.Element {
  return (
    <AuthGate>
      <LobbyContent roomId={roomId} initialRoom={initialRoom} />
    </AuthGate>
  );
}

function LobbyContent({ roomId, initialRoom }: LobbyProps): JSX.Element {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [room, setRoom] = useState<LobbyRoom | undefined>(initialRoom);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [chosen, setChosen] = useState<DeviceState>(readDevices);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [permissionError, setPermissionError] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialRoom === undefined);

  const partner = room?.members.find((member) => member.id !== user?.id);

  const stopStream = useCallback((): void => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startPreview = useCallback(async (): Promise<void> => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: chosen.cameraId ? { deviceId: { exact: chosen.cameraId } } : true,
        audio: chosen.microphoneId ? { deviceId: { exact: chosen.microphoneId } } : true,
      });
      streamRef.current = stream;
      if (videoRef.current !== null) {
        videoRef.current.srcObject = stream;
      }
      setPermissionError(false);
      const available = await navigator.mediaDevices.enumerateDevices();
      setDevices(available);
    } catch (error) {
      if (
        (error instanceof DOMException || error instanceof Error) &&
        error.name === 'NotAllowedError'
      ) {
        setPermissionError(true);
        return;
      }
      throw error;
    }
  }, [chosen.cameraId, chosen.microphoneId, stopStream]);

  useEffect(() => {
    let active = true;
    if (room === undefined) {
      apiFetch<LobbyRoom>(`/rooms/${roomId}`)
        .then((result) => {
          if (active) setRoom(result);
        })
        .catch(() => router.replace('/dashboard'))
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    void startPreview();
    return () => {
      active = false;
      stopStream();
    };
  }, [room, roomId, router, startPreview, stopStream]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const tracks = streamRef.current?.getAudioTracks() ?? [];
      setAudioLevel(
        microphoneEnabled && tracks.some((track) => track.enabled) ? 58 : 0,
      );
    }, 250);
    return () => window.clearInterval(timer);
  }, [microphoneEnabled]);

  const updateDevice = (key: keyof DeviceState) => (event: ChangeEvent<HTMLSelectElement>): void => {
    const next = { ...chosen, [key]: event.target.value };
    setChosen(next);
    window.localStorage.setItem(DEVICE_KEY, JSON.stringify(next));
    void startPreview();
  };

  const toggleTrack = (kind: 'audio' | 'video'): void => {
    const tracks = kind === 'audio'
      ? streamRef.current?.getAudioTracks()
      : streamRef.current?.getVideoTracks();
    tracks?.forEach((track) => {
      track.enabled = kind === 'audio' ? !microphoneEnabled : !cameraEnabled;
    });
    if (kind === 'audio') setMicrophoneEnabled((value) => !value);
    else setCameraEnabled((value) => !value);
  };

  const getInviteLink = async (): Promise<string> => {
    const link =
      inviteUrl ??
      `${window.location.origin}/join/${
        (await apiFetch<{ token: string }>(`/rooms/${roomId}/invite`, {
          method: 'POST',
        })).token
      }`;
    setInviteUrl(link);
    return link;
  };

  const copyInvite = async (): Promise<void> => {
    try {
      const link = await getInviteLink();
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error('Unable to create or copy room invite.', error);
    }
  };

  const shareWhatsApp = async (): Promise<void> => {
    try {
      const link = await getInviteLink();
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`Join me for a date night on 2Seats: ${link}`)}`,
        '_blank',
        'noopener,noreferrer',
      );
    } catch (error) {
      console.error('Unable to create room invite for WhatsApp.', error);
    }
  };

  if (loading) {
    return <main className="mx-auto grid min-h-[70svh] max-w-5xl place-items-center px-5 text-blush">Finding your room…</main>;
  }

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-6xl px-5 pb-16 pt-8 sm:px-10 sm:pt-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blush">Your date room</p>
          <h1 className="type-display-page mt-2 text-cream">{room?.name ?? 'A room for two'}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="glass" size="sm" onClick={copyInvite}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy invite link'}
          </Button>
          <Button variant="glass" size="sm" onClick={shareWhatsApp}>
            <MonitorUp className="size-4" /> WhatsApp
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass rounded-3xl p-4 sm:p-6" aria-labelledby="preview-heading">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="preview-heading" className="type-display-card text-cream">Before we press play</h2>
            <span className="flex items-center gap-2 text-xs text-cream/50"><Volume2 className="size-4 text-candle" /> Live preview</span>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-midnight/80">
            <video ref={videoRef} autoPlay muted playsInline className={`size-full object-cover ${cameraEnabled ? '' : 'invisible'}`} aria-label="Your camera preview" />
            {!cameraEnabled && <div className="absolute inset-0 grid place-items-center text-cream/60"><VideoOff className="size-8" /></div>}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-midnight/70 px-3 py-2 text-xs text-cream/80 backdrop-blur">
              <span>{displayName || 'Your seat'}</span>
              <span className="flex items-center gap-2" aria-label={`Microphone level ${audioLevel}%`}>
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-candle transition-[width]" style={{ width: `${audioLevel}%` }} /></span>
                {microphoneEnabled ? <Mic className="size-4 text-candle" /> : <MicOff className="size-4 text-rose" />}
              </span>
            </div>
          </div>
          {permissionError && (
            <div className="mt-4 rounded-2xl border border-candle/30 bg-candle/10 p-4 text-sm text-cream" role="alert">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-candle" />
                <div>
                  <p className="font-semibold">Camera and microphone access is needed</p>
                  <p className="mt-1 text-cream/65">{browserPermissionSteps()}</p>
                  <Button className="mt-3" size="sm" variant="glass" onClick={() => void startPreview()}><RefreshCw className="size-4" /> Try again</Button>
                </div>
              </div>
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-cream/55">Camera<select value={chosen.cameraId} onChange={updateDevice('cameraId')} className="mt-1 flex min-h-11 w-full appearance-none rounded-xl border border-rose/20 bg-midnight/70 px-3 text-sm text-cream"><option value="">Default camera</option>{devices.filter((device) => device.kind === 'videoinput').map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || 'Camera'}</option>)}</select></label>
            <label className="text-xs text-cream/55">Microphone<select value={chosen.microphoneId} onChange={updateDevice('microphoneId')} className="mt-1 flex min-h-11 w-full appearance-none rounded-xl border border-rose/20 bg-midnight/70 px-3 text-sm text-cream"><option value="">Default microphone</option>{devices.filter((device) => device.kind === 'audioinput').map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || 'Microphone'}</option>)}</select></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant={microphoneEnabled ? 'glass' : 'primary'} size="sm" onClick={() => toggleTrack('audio')}>{microphoneEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />} {microphoneEnabled ? 'Mute' : 'Unmute'}</Button>
            <Button variant={cameraEnabled ? 'glass' : 'primary'} size="sm" onClick={() => toggleTrack('video')}>{cameraEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />} {cameraEnabled ? 'Camera on' : 'Camera off'}</Button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="glass rounded-3xl p-6">
            <label className="block text-sm text-cream/65" htmlFor="display-name">Name on your seat</label>
            <Input id="display-name" label="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2" />
            <Button className="mt-4 w-full" onClick={() => router.push(`/room/${roomId}`)} disabled={displayName.trim() === ''}>Join the date <Sparkles className="size-4" /></Button>
          </div>
          <div className="glass rounded-3xl p-6" aria-label="Seats">
            <p className="text-xs uppercase tracking-[0.25em] text-blush">Two seats, one feeling</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Seat label={displayName || 'Your seat'} avatarUrl={user?.avatarUrl ?? null} filled />
              <Seat label={partner?.displayName ?? 'Waiting for them…'} avatarUrl={partner?.avatarUrl ?? null} filled={partner !== undefined} partner />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Seat({ label, avatarUrl, filled, partner = false }: { label: string; avatarUrl: string | null; filled: boolean; partner?: boolean }): JSX.Element {
  return (
    <motion.div
      layout
      transition={springs.playful}
      className={`relative grid min-h-44 place-items-center rounded-3xl border p-4 text-center ${filled ? 'border-rose/40 bg-rose/10' : 'border-candle/30 bg-candle/5'}`}
      aria-label={partner ? 'Partner seat' : 'Your seat'}
      data-filled={filled}
    >
      {filled ? (
        <motion.div initial={partner ? { opacity: 0, x: 30, scale: 0.8 } : false} animate={{ opacity: 1, x: 0, scale: 1 }} transition={springs.playful} className="grid justify-items-center gap-3">
          {avatarUrl ? <div aria-label={`${label} avatar`} role="img" className="size-16 rounded-full bg-cover bg-center ring-2 ring-rose/50" style={{ backgroundImage: `url("${avatarUrl}")` }} /> : <div className="grid size-16 place-items-center rounded-full bg-rose/25 text-2xl text-blush">{label.charAt(0).toUpperCase()}</div>}
          <span className="text-sm text-cream">{label}</span>
          {partner && <span className="absolute right-3 top-3 text-rose" aria-hidden="true">♥</span>}
        </motion.div>
      ) : (
        <div className="grid justify-items-center gap-3 text-cream/55">
          <div className="size-16 animate-pulse rounded-full border border-candle/40 bg-candle/10 motion-reduce:animate-none" />
          <span className="text-sm">{label}</span>
        </div>
      )}
    </motion.div>
  );
}
