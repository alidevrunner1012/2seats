'use client';

import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useConnectionState, useLocalParticipant, useMediaDeviceSelect, useParticipants, useTracks } from '@livekit/components-react';
import { ConnectionState, Track, type Participant } from 'livekit-client';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Camera, CameraOff, ChevronDown, Expand, Mic, MicOff, Pin, PinOff, Radio, Settings2, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { apiFetch } from '@/lib/api-client';
import { springs } from '@/lib/motion';

interface VideoPanelProps {
  roomId: string;
  roomName: string;
}
interface TokenResponse { token: string; url: string; expiresIn: number }
interface TileProps { participant: Participant; trackRef?: ReturnType<typeof useTracks>[number]; pinned: boolean; onPin: () => void; tileSize: number }

export function VideoPanel({ roomId, roomName }: VideoPanelProps): JSX.Element {
  const [credentials, setCredentials] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void apiFetch<TokenResponse>(`/rooms/${roomId}/livekit-token`)
      .then((result) => { if (active) setCredentials(result); })
      .catch(() => { if (active) setError('We could not open the video seats just yet.'); });
    return () => { active = false; };
  }, [roomId]);
  if (error) return <VideoStatus message={error} />;
  if (credentials === null) return <VideoStatus message="Warming the seats for you…" />;
  return <LiveKitRoom serverUrl={credentials.url} token={credentials.token} connect audio video options={{ adaptiveStream: true, dynacast: true }}><LiveKitVideoPanel roomName={roomName} /></LiveKitRoom>;
}

function LiveKitVideoPanel({ roomName }: { roomName: string }): JSX.Element {
  const reduced = useReducedMotion();
  const participants = useParticipants();
  const tracks = useTracks([Track.Source.Camera]);
  const connection = useConnectionState();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const [pinned, setPinned] = useState<string | null>(null);
  const [tileSize, setTileSize] = useState(42);
  const [showDevices, setShowDevices] = useState(false);
  const camera = useMediaDeviceSelect({ kind: 'videoinput' });
  const microphone = useMediaDeviceSelect({ kind: 'audioinput' });
  const participantTracks = useMemo(() => new Map(tracks.map((track) => [track.participant.identity, track])), [tracks]);
  const partner = participants.find((participant) => participant.identity !== localParticipant.identity);
  const local = participants.find((participant) => participant.identity === localParticipant.identity) ?? localParticipant;

  return (
    <div className="video-panel-shell" aria-label={`${roomName} video`}>
      {connection !== ConnectionState.Connected && <div className="video-reconnect-banner"><WifiOff className="size-4" /> {connection === ConnectionState.Reconnecting ? 'Finding your seat again…' : 'Video is getting ready…'}</div>}
      <div className="video-panel-toolbar"><span className="flex items-center gap-2 text-xs text-cream/55"><Radio className="size-3 text-rose" /> Live seats <span className="video-network"><Wifi className="size-3" /> Good</span></span><button className="video-device-button" onClick={() => setShowDevices((value) => !value)} aria-label="Video device settings"><Settings2 className="size-4" /></button></div>
      {showDevices && <div className="video-device-menu"><DeviceSelect label="Camera" devices={camera.devices} active={camera.activeDeviceId} onChange={camera.setActiveMediaDevice} /><DeviceSelect label="Microphone" devices={microphone.devices} active={microphone.activeDeviceId} onChange={microphone.setActiveMediaDevice} /></div>}
      <div className="video-cozy-stage">
        <AnimatePresence mode="popLayout">
          <motion.div key={local.identity} initial={{ opacity: 0, y: reduced ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} transition={springs.soft} className="video-seat-wrap" style={{ '--tile-size': `${tileSize}%` } as CSSProperties}><SeatArt /><ParticipantTile participant={local} trackRef={participantTracks.get(local.identity)} pinned={pinned === local.identity} onPin={() => setPinned(pinned === local.identity ? null : local.identity)} tileSize={tileSize} /><span className="video-seat-label">You</span></motion.div>
          {partner ? <motion.div key={partner.identity} initial={{ opacity: 0, y: reduced ? 0 : 28, scale: reduced ? 1 : 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduced ? 0 : 18 }} transition={springs.playful} className="video-seat-wrap" style={{ '--tile-size': `${tileSize}%` } as CSSProperties}><SeatArt /><ParticipantTile participant={partner} trackRef={participantTracks.get(partner.identity)} pinned={pinned === partner.identity} onPin={() => setPinned(pinned === partner.identity ? null : partner.identity)} tileSize={tileSize} /><span className="video-seat-label">{partner.name || 'Your person'}</span></motion.div> : <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="video-seat-wrap video-empty-seat"><SeatArt /><div className="video-empty-glow"><span>Waiting for them…</span><small>Their seat is glowing</small></div></motion.div>}
        </AnimatePresence>
      </div>
      <div className="video-panel-controls"><button className="video-control-button" onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)} aria-label={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}>{isMicrophoneEnabled ? <Mic /> : <MicOff />}</button><button className="video-control-button" onClick={() => void localParticipant.setCameraEnabled(!isCameraEnabled)} aria-label={isCameraEnabled ? 'Turn camera off' : 'Turn camera on'}>{isCameraEnabled ? <Camera /> : <CameraOff />}</button><label className="video-size-control"><span>Tile size</span><input type="range" min="28" max="58" value={tileSize} onChange={(event) => setTileSize(Number(event.target.value))} aria-label="Tile size" /></label></div>
      <RoomAudioRenderer />
    </div>
  );
}

function ParticipantTile({ participant, trackRef, pinned, onPin }: TileProps): JSX.Element {
  const cameraOn = participant.isCameraEnabled;
  const name = participant.name || 'Guest';
  const usableTrack = trackRef && 'publication' in trackRef && trackRef.publication !== undefined ? trackRef : undefined;
  return <div data-participant={participant.identity} className={`video-participant-tile ${participant.isSpeaking ? 'speaking' : ''} ${pinned ? 'pinned' : ''}`}><div className="video-tile-media">{cameraOn && usableTrack ? <VideoTrack trackRef={usableTrack} /> : <div className="video-avatar-fallback" aria-label={`${name} avatar`}>{name.slice(0, 1).toUpperCase()}</div>}</div><div className="video-tile-footer"><span>{name}</span><button onClick={onPin} aria-label={pinned ? `Unpin ${name}` : `Pin ${name}`}>{pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}</button><button aria-label={`Picture in picture for ${name}`} onClick={() => { const video = document.querySelector(`[data-participant="${participant.identity}"] video`) as HTMLVideoElement | null; void video?.requestPictureInPicture?.(); }}><Expand className="size-3.5" /></button></div></div>;
}

function DeviceSelect({ label, devices, active, onChange }: { label: string; devices: MediaDeviceInfo[]; active: string; onChange: (id: string) => Promise<void> }): JSX.Element {
  return <label className="video-device-select">{label}<select value={active} onChange={(event) => void onChange(event.target.value)}>{devices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || `${label} ${device.deviceId.slice(0, 4)}`}</option>)}</select></label>;
}

function SeatArt(): JSX.Element { return <div className="video-seat-art" aria-hidden="true"><div className="video-seat-back" /><div className="video-seat-cushion" /></div>; }
function VideoStatus({ message }: { message: string }): JSX.Element { return <div className="video-status"><WifiOff className="size-8 text-blush/70" /><span>{message}</span></div>; }
