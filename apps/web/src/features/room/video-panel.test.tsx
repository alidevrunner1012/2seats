import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoPanel } from './video-panel';

const setMicrophoneEnabled = vi.fn().mockResolvedValue(undefined);
const setCameraEnabled = vi.fn().mockResolvedValue(undefined);
let participants = [{ identity: 'user-1', name: 'Avery', isCameraEnabled: true, isMicrophoneEnabled: true, isSpeaking: false }];

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn().mockResolvedValue({ token: 'token', url: 'ws://localhost:7880', expiresIn: 600 }),
}));

vi.mock('@livekit/components-react', () => ({
  LiveKitRoom: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  RoomAudioRenderer: () => null,
  VideoTrack: () => <div data-testid="video-track" />,
  useConnectionState: () => 'connected',
  useLocalParticipant: () => ({
    localParticipant: { identity: 'user-1', name: 'Avery', setMicrophoneEnabled, setCameraEnabled },
    isMicrophoneEnabled: true,
    isCameraEnabled: true,
    isScreenShareEnabled: false,
    setMicrophoneEnabled,
    setCameraEnabled,
  }),
  useMediaDeviceSelect: () => ({
    devices: [{ deviceId: 'default', label: 'Default device' }],
    activeDeviceId: 'default',
    setActiveMediaDevice: vi.fn().mockResolvedValue(undefined),
  }),
  useParticipants: () => participants,
  useTracks: () => [],
}));

describe('VideoPanel', () => {
  beforeEach(() => {
    participants = [{ identity: 'user-1', name: 'Avery', isCameraEnabled: true, isMicrophoneEnabled: true, isSpeaking: false }];
    setMicrophoneEnabled.mockClear();
    setCameraEnabled.mockClear();
  });

  it('shows the glowing empty partner seat until they arrive', async () => {
    render(<VideoPanel roomId="room-1" roomName="Friday night" />);
    expect(await screen.findByText('Waiting for them…')).toBeInTheDocument();
    expect(screen.getByText('Their seat is glowing')).toBeInTheDocument();
  });

  it('renders the partner name and toggles local camera and microphone', async () => {
    participants = [
      { identity: 'user-1', name: 'Avery', isCameraEnabled: true, isMicrophoneEnabled: true, isSpeaking: false },
      { identity: 'user-2', name: 'Sam', isCameraEnabled: false, isMicrophoneEnabled: true, isSpeaking: true },
    ];
    render(<VideoPanel roomId="room-1" roomName="Friday night" />);
    expect((await screen.findAllByText('Sam')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Sam avatar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mute microphone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn camera off' }));
    await waitFor(() => {
      expect(setMicrophoneEnabled).toHaveBeenCalledWith(false);
      expect(setCameraEnabled).toHaveBeenCalledWith(false);
    });
  });
});
