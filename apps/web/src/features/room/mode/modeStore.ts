import { create } from 'zustand';

export type RoomMode = 'player' | 'screen' | 'browser';
export const ROOM_MODES: { id: RoomMode; label: string }[] = [
  { id: 'player', label: 'Player' },
  { id: 'screen', label: 'Screen share' },
  { id: 'browser', label: 'Shared browser' },
];
export const isRoomMode = (v: unknown): v is RoomMode => v === 'player' || v === 'screen' || v === 'browser';

interface ModeState { mode: RoomMode; setMode: (m: RoomMode) => void; applyRemote: (m: unknown) => void }

/** `mode` is shared room state: server is the source of truth, this store mirrors it. */
export const useModeStore = create<ModeState>((set, get) => ({
  mode: 'player',
  setMode: (mode) => set({ mode }),
  applyRemote: (m) => { if (isRoomMode(m) && m !== get().mode) set({ mode: m }); },
}));
