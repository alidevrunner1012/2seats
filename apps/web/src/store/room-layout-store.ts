import { create } from 'zustand';

export type PanelId = 'screen' | 'video' | 'chat';
export type LayoutPreset = 'cinema' | 'side-by-side' | 'faces' | 'chat-heavy';
export interface PanelRect { x: number; y: number; width: number; height: number; z: number; open: boolean; }
export type LayoutState = { panels: Record<PanelId, PanelRect>; preset: LayoutPreset; dimLights: boolean; hydrated: boolean };
interface RoomLayoutActions {
  hydrate: () => void;
  setPanel: (id: PanelId, rect: Partial<PanelRect>) => void;
  focus: (id: PanelId) => void;
  togglePanel: (id: PanelId) => void;
  setPreset: (preset: LayoutPreset) => void;
  toggleDimLights: () => void;
  snap: (id: PanelId, viewport: { width: number; height: number }) => void;
}

const key = '2seats:room-layout';
const defaults: Record<PanelId, PanelRect> = {
  screen: { x: 32, y: 82, width: 720, height: 440, z: 3, open: true },
  video: { x: 780, y: 82, width: 330, height: 250, z: 2, open: true },
  chat: { x: 780, y: 350, width: 330, height: 360, z: 1, open: true },
};
const presets: Record<LayoutPreset, Record<PanelId, Partial<PanelRect>>> = {
  cinema: { screen: { x: 32, y: 82, width: 720, height: 440 }, video: { x: 780, y: 82, width: 330, height: 250 }, chat: { x: 780, y: 350, width: 330, height: 360 } },
  'side-by-side': { screen: { x: 32, y: 82, width: 540, height: 520 }, video: { x: 590, y: 82, width: 520, height: 520 }, chat: { x: 32, y: 620, width: 1078, height: 180 } },
  faces: { screen: { x: 32, y: 82, width: 620, height: 430 }, video: { x: 680, y: 82, width: 430, height: 430 }, chat: { x: 32, y: 540, width: 1078, height: 220 } },
  'chat-heavy': { screen: { x: 32, y: 82, width: 560, height: 430 }, video: { x: 610, y: 82, width: 260, height: 220 }, chat: { x: 610, y: 320, width: 500, height: 440 } },
};

export const useRoomLayoutStore = create<LayoutState & RoomLayoutActions>((set, get) => ({
  panels: defaults, preset: 'cinema', dimLights: false, hydrated: false,
  hydrate: () => {
    if (get().hydrated || typeof window === 'undefined') return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) ?? 'null') as Partial<LayoutState> | null;
      if (saved?.panels) set({ panels: { ...defaults, ...saved.panels }, preset: saved.preset ?? 'cinema', dimLights: saved.dimLights === true, hydrated: true });
      else set({ hydrated: true });
    } catch { set({ hydrated: true }); }
  },
  setPanel: (id, rect) => set((state) => ({ panels: { ...state.panels, [id]: { ...state.panels[id], ...rect } } })),
  focus: (id) => set((state) => {
    const z = Math.max(...Object.values(state.panels).map((panel) => panel.z)) + 1;
    return { panels: { ...state.panels, [id]: { ...state.panels[id], z } } };
  }),
  togglePanel: (id) => set((state) => ({ panels: { ...state.panels, [id]: { ...state.panels[id], open: !state.panels[id].open } } })),
  setPreset: (preset) => set((state) => ({ preset, panels: { ...state.panels, ...Object.fromEntries(Object.entries(presets[preset]).map(([id, rect]) => [id, { ...state.panels[id as PanelId], ...rect }])) } as LayoutState['panels'] })),
  toggleDimLights: () => set((state) => ({ dimLights: !state.dimLights })),
  snap: (id, viewport) => set((state) => {
    const panel = state.panels[id];
    const x = panel.x + panel.width / 2 < viewport.width / 2 ? 16 : Math.max(16, viewport.width - panel.width - 16);
    const y = panel.y < 90 ? 82 : Math.min(panel.y, Math.max(82, viewport.height - panel.height - 24));
    return { panels: { ...state.panels, [id]: { ...panel, x, y } } };
  }),
}));

export function persistRoomLayout(state: LayoutState): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify({ panels: state.panels, preset: state.preset, dimLights: state.dimLights }));
}
