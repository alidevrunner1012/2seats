'use client';
import { isTrackReference, useLocalParticipant, useTracks, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useState } from 'react';
import { SHARE_PRESETS, ShareQuality, canShareScreen, shareState } from './screenShare';

export function ScreenSharePanel() {
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.ScreenShare]).filter(isTrackReference);
  const [quality, setQuality] = useState<ShareQuality>('720p');
  const [tips, setTips] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = shareState(tracks.map((t) => ({ isLocal: t.participant.isLocal })));
  const supported = typeof navigator !== 'undefined' && canShareScreen(navigator);
  const remote = tracks[0];

  async function start() {
    setError(null);
    const p = SHARE_PRESETS[quality];
    try {
      await localParticipant.setScreenShareEnabled(
        true,
        { audio: true, resolution: { width: p.width, height: p.height, frameRate: p.frameRate } },
        { screenShareEncoding: { maxBitrate: p.maxBitrate, maxFramerate: p.frameRate } },
      );
    } catch (e) {
      const name = (e as { name?: string }).name;
      setError(name === 'NotAllowedError' ? 'Sharing was cancelled. Try again whenever you are ready.' : 'Could not start sharing.');
    }
  }
  const stop = () => localParticipant.setScreenShareEnabled(false);

  if (!supported) {
    return (
      <div className="glass grid h-full place-items-center p-6 text-center text-[#FFB3C6]">
        <p>Screen sharing is not available on this device. Ask your partner to share from a laptop, or use the Player.</p>
      </div>
    );
  }
  return (
    <div className="relative flex h-full flex-col gap-3">
      <div className="relative flex-1 overflow-hidden rounded-2xl bg-black">
        {remote ? (
          <VideoTrack trackRef={remote} className="h-full w-full object-contain" />
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-[#FFB3C6]">
            <div>
              <p className="font-serif text-xl text-[#FFF4EC]">Nobody is sharing yet</p>
              <p className="mt-1 text-sm">Share a tab with Netflix, Hotstar or anything else you both have access to.</p>
            </div>
          </div>
        )}
        {state === 'me' && <span className="absolute left-3 top-3 rounded-full bg-[#E8466C] px-3 py-1 text-xs">You are sharing</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {state === 'me' ? (
          <button onClick={stop} className="rounded-full bg-[#E8466C] px-5 py-2 text-sm font-semibold">Stop sharing</button>
        ) : (
          <button onClick={start} disabled={state === 'partner'}
            className="rounded-full bg-[#E8466C] px-5 py-2 text-sm font-semibold disabled:opacity-40">
            {state === 'partner' ? 'They are sharing' : 'Share my screen / tab'}
          </button>
        )}
        <label className="flex items-center gap-2 text-sm text-[#FFB3C6]">
          Quality
          <select value={quality} disabled={state === 'me'} onChange={(e) => setQuality(e.target.value as ShareQuality)}
            className="rounded-full bg-[#3B0F26] px-3 py-1.5 text-[#FFF4EC]">
            <option value="720p">720p (smooth)</option><option value="1080p">1080p (sharp)</option>
          </select>
        </label>
        <button onClick={() => setTips(true)} className="text-sm text-[#FFB3C6] underline">Sound tips</button>
      </div>
      {error && <p role="alert" className="text-sm text-[#FFB86B]">{error}</p>}

      {tips && (
        <div role="dialog" aria-modal="true" aria-label="Screen share tips"
          className="absolute inset-0 z-10 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setTips(false)}>
          <div className="glass max-w-sm rounded-2xl p-5 text-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 font-serif text-lg">For sound to work</h3>
            <ol className="list-decimal space-y-1 pl-5 text-[#FFB3C6]">
              <li>Choose <b>Chrome Tab</b> (not Window).</li>
              <li>Tick <b>Share tab audio</b> at the bottom of the picker.</li>
              <li>Netflix/Prime may show a black screen in some browsers: use Chrome or Edge.</li>
            </ol>
            <button autoFocus onClick={() => setTips(false)} className="mt-4 rounded-full bg-[#E8466C] px-4 py-1.5">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
