import { beforeEach, describe, expect, it } from 'vitest';
import { isRoomMode, useModeStore } from './modeStore';

describe('modeStore', () => {
  beforeEach(() => useModeStore.setState({ mode: 'player' }));
  it('defaults to player', () => expect(useModeStore.getState().mode).toBe('player'));
  it('setMode updates', () => { useModeStore.getState().setMode('screen'); expect(useModeStore.getState().mode).toBe('screen'); });
  it('applyRemote accepts valid modes', () => { useModeStore.getState().applyRemote('browser'); expect(useModeStore.getState().mode).toBe('browser'); });
  it('applyRemote ignores junk', () => {
    useModeStore.getState().applyRemote('hacked'); useModeStore.getState().applyRemote(undefined);
    expect(useModeStore.getState().mode).toBe('player');
  });
  it('isRoomMode guards', () => { expect(isRoomMode('screen')).toBe(true); expect(isRoomMode('x')).toBe(false); });
});
