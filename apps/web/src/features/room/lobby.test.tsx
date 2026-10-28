import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Lobby } from './lobby';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    id: 'room-1',
    name: 'Friday night',
    inviteCode: 'ABCD-EFGH',
    role: 'HOST',
    createdAt: '2026-01-01T00:00:00.000Z',
    members: [{ id: 'user-1', displayName: 'Avery', avatarUrl: null }],
    lastMovieTitle: null,
  }),
}));

vi.mock('@/features/auth/auth-gate', () => ({
  AuthGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/store/auth-store', () => ({
  useAuthStore: (selector: (state: { user: { id: string; displayName: string; avatarUrl: null } }) => unknown) =>
    selector({ user: { id: 'user-1', displayName: 'Avery', avatarUrl: null } }),
}));

describe('Lobby', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(
          Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }),
        ),
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 Chrome/120.0',
    });
    window.localStorage.clear();
  });

  it('explains camera permission denial and offers retry', async () => {
    render(<Lobby roomId="room-1" />);

    expect(await screen.findByText('Camera and microphone access is needed')).toBeInTheDocument();
    expect(screen.getByText(/Chrome: select Allow in the address bar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('fills the partner seat when a partner is present', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [],
          getAudioTracks: () => [],
        }),
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 Safari/605.1.15',
    });
    render(
      <Lobby
        roomId="room-1"
        initialRoom={{
          id: 'room-1',
          name: 'Friday night',
          inviteCode: 'ABCD-EFGH',
          role: 'HOST',
          createdAt: '2026-01-01T00:00:00.000Z',
          members: [
            { id: 'user-1', displayName: 'Avery', avatarUrl: null },
            { id: 'user-2', displayName: 'Sam', avatarUrl: null },
          ],
          lastMovieTitle: null,
        }}
      />,
    );

    await waitFor(() => expect(screen.getByText('Sam')).toBeInTheDocument());
    expect(screen.queryByText('Waiting for them…')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Partner seat')).toHaveAttribute('data-filled', 'true');
  });
});
