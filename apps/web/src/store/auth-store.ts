import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (session: AuthSession) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: ({ accessToken, user }) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null }),
}));

export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}
