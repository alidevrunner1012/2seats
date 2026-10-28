import { create } from 'zustand';

interface SessionState {
  displayName: string | null;
  setDisplayName: (displayName: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  displayName: null,
  setDisplayName: (displayName) => set({ displayName }),
}));
