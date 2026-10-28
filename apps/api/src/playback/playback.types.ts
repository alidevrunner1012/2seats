export type PlaybackMode = 'player' | 'screen' | 'browser';
export type PlaybackSource = {
  type: 'url' | 'youtube' | 'vimeo' | 'hls' | 'dash';
  url: string;
  title: string;
};
export type PlaybackStatus = 'playing' | 'paused' | 'ended';
export type PlaybackState = {
  mode: PlaybackMode;
  source: PlaybackSource | null;
  status: PlaybackStatus;
  position: number;
  rate: number;
  updatedAt: number;
  version: number;
  startedAt?: number;
};
export type PlaybackBroadcast = PlaybackState & { serverTime: number };
