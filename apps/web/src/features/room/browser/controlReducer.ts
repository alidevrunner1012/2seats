export interface ControlState { controllerId: string | null; pendingFrom: string | null }
export type ControlEvent = { type: 'state'; controllerId: string | null; pendingFrom?: string | null } | { type: 'reset' };
export const initialControl: ControlState = { controllerId: null, pendingFrom: null };

export function controlReducer(s: ControlState, e: ControlEvent): ControlState {
  if (e.type === 'reset') return initialControl;
  return { controllerId: e.controllerId ?? null, pendingFrom: e.pendingFrom ?? null };
}
export type ControlRole = 'free' | 'me' | 'other';
export function roleOf(s: ControlState, me: string | null): ControlRole {
  if (!s.controllerId) return 'free';
  return s.controllerId === me ? 'me' : 'other';
}
/** I hold the mouse and someone is asking for it. */
export const hasIncomingRequest = (s: ControlState, me: string | null) =>
  !!me && s.controllerId === me && !!s.pendingFrom && s.pendingFrom !== me;
