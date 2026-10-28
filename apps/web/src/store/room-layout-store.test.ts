import { beforeEach, describe, expect, it } from 'vitest';
import { persistRoomLayout, useRoomLayoutStore } from './room-layout-store';

describe('room layout store', () => {
  beforeEach(() => { useRoomLayoutStore.setState({ hydrated: false, preset: 'cinema', dimLights: false }); window.localStorage.clear(); });
  it('snaps panels to the nearest horizontal edge', () => {
    useRoomLayoutStore.getState().setPanel('chat', { x: 100, y: 100 });
    useRoomLayoutStore.getState().snap('chat', { width: 1000, height: 800 });
    expect(useRoomLayoutStore.getState().panels.chat.x).toBe(16);
  });
  it('applies the side-by-side preset', () => {
    useRoomLayoutStore.getState().setPreset('side-by-side');
    expect(useRoomLayoutStore.getState().panels.screen.width).toBe(540);
    expect(useRoomLayoutStore.getState().panels.video.x).toBe(590);
  });
  it('persists the selected layout', () => {
    useRoomLayoutStore.getState().toggleDimLights();
    persistRoomLayout(useRoomLayoutStore.getState());
    expect(window.localStorage.getItem('2seats:room-layout')).toContain('"dimLights":true');
  });
});
