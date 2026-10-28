import { afterEach, describe, expect, it } from 'vitest';
import { usePreferenceStore } from './preference-store';

describe('preference store', () => {
  afterEach(() => {
    localStorage.clear();
    usePreferenceStore.setState({
      soundEnabled: false,
      cursorEnabled: false,
      reducedMotionEnabled: false,
      language: 'en',
      hydrated: false,
    });
  });

  it('persists accessible interaction and language preferences', () => {
    usePreferenceStore.getState().update({
      soundEnabled: true,
      cursorEnabled: true,
      reducedMotionEnabled: true,
      language: 'hi',
    });

    expect(
      JSON.parse(localStorage.getItem('2seats:preferences') ?? '{}'),
    ).toEqual({
      soundEnabled: true,
      cursorEnabled: true,
      reducedMotionEnabled: true,
      language: 'hi',
    });
  });

  it('hydrates saved settings without persisting authentication data', () => {
    localStorage.setItem(
      '2seats:preferences',
      JSON.stringify({
        soundEnabled: true,
        cursorEnabled: false,
        reducedMotionEnabled: true,
        language: 'hi',
      }),
    );

    usePreferenceStore.getState().hydrate();

    expect(usePreferenceStore.getState()).toMatchObject({
      soundEnabled: true,
      cursorEnabled: false,
      reducedMotionEnabled: true,
      language: 'hi',
      hydrated: true,
    });
  });
});
