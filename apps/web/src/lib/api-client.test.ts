import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api-client';
import { useAuthStore } from '@/store/auth-store';

describe('apiFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().clear();
  });

  it('silently rotates a session and retries with the new in-memory access token', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        Response.json({
          accessToken: 'fresh-access-token',
          user: {
            id: 'user-1',
            email: 'date@example.com',
            displayName: 'Avery',
            avatarUrl: null,
            emailVerified: true,
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'room-1' }), { status: 200 }),
      );
    useAuthStore.getState().setAccessToken('expired-access-token');

    await expect(apiFetch<{ id: string }>('/rooms/current')).resolves.toEqual({
      id: 'room-1',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://localhost:3001/auth/refresh',
    );
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization'),
    ).toBe('Bearer expired-access-token');
    expect(
      new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get('Authorization'),
    ).toBe('Bearer fresh-access-token');
    expect(useAuthStore.getState().accessToken).toBe('fresh-access-token');
  });

  it('returns a typed error when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Room not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(apiFetch('/rooms/missing')).rejects.toMatchObject({
      message: 'Room not found',
      status: 404,
    });
  });
});
