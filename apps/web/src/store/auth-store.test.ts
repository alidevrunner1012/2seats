import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth-store';

describe('auth store', () => {
  afterEach(() => useAuthStore.getState().clear());

  it('keeps the access token and safe user only in memory', () => {
    const user = {
      id: 'user-1',
      email: 'date@example.com',
      displayName: 'Avery',
      avatarUrl: null,
      emailVerified: true,
    };
    useAuthStore.getState().setSession({ accessToken: 'access-1', user });

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'access-1',
      user,
    });
    expect(localStorage.getItem('2seats:auth')).toBeNull();

    useAuthStore.getState().clear();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
