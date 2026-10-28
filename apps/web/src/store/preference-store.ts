import { create } from 'zustand';

export interface UserPreferences {
  soundEnabled: boolean;
  cursorEnabled: boolean;
  reducedMotionEnabled: boolean;
  language: 'en' | 'hi';
}

interface PreferenceState extends UserPreferences {
  hydrated: boolean;
  hydrate: () => void;
  update: (values: Partial<UserPreferences>) => void;
}

const STORAGE_KEY = '2seats:preferences';

export const usePreferenceStore = create<PreferenceState>((set, get) => ({
  soundEnabled: false,
  cursorEnabled: false,
  reducedMotionEnabled: false,
  language: 'en',
  hydrated: false,
  hydrate: () => {
    if (get().hydrated || typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      set({ hydrated: true });
      return;
    }
    try {
      const value: unknown = JSON.parse(saved);
      if (typeof value === 'object' && value !== null) {
        const preferences = value as Partial<UserPreferences>;
        set({
          soundEnabled: preferences.soundEnabled === true,
          cursorEnabled: preferences.cursorEnabled === true,
          reducedMotionEnabled: preferences.reducedMotionEnabled === true,
          language: preferences.language === 'hi' ? 'hi' : 'en',
          hydrated: true,
        });
      } else {
        set({ hydrated: true });
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      set({ hydrated: true });
    }
  },
  update: (values) => {
    const next = {
      soundEnabled: values.soundEnabled ?? get().soundEnabled,
      cursorEnabled: values.cursorEnabled ?? get().cursorEnabled,
      reducedMotionEnabled:
        values.reducedMotionEnabled ?? get().reducedMotionEnabled,
      language: values.language ?? get().language,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set(next);
  },
}));
