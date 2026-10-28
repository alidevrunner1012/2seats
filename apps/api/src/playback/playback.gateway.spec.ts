import { PlaybackGateway } from './playback.gateway';
import type { PlaybackService } from './playback.service';
import type { PrismaService } from '../prisma/prisma.service';

function setup(everyoneCanControl = true) {
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const playback = {
    state: jest.fn().mockResolvedValue({ mode: 'player', source: null, status: 'paused', position: 0, rate: 1, updatedAt: 0, version: 0 }),
    mutate: jest.fn().mockResolvedValue({ mode: 'screen', source: null, status: 'paused', position: 0, rate: 1, updatedAt: 2, version: 1 }),
    validateSource: jest.fn().mockResolvedValue(undefined),
    recordEnded: jest.fn().mockResolvedValue(true),
  } as unknown as PlaybackService;
  const gateway = new PlaybackGateway(
    playback,
    { room: { findUnique: jest.fn().mockResolvedValue({ everyoneCanControl }) }, roomMember: { findFirst: jest.fn().mockResolvedValue({ role: 'HOST' }) } } as unknown as PrismaService,
  );
  gateway.server = { to: jest.fn(() => ({ emit: (event: string, payload: unknown) => emitted.push({ event, payload }) })) } as never;
  const socket = { data: { user: { id: 'user-1' }, roomIds: new Set(['room-1']) } } as never;
  return { gateway, playback, socket, emitted };
}

describe('PlaybackGateway', () => {
  it('broadcasts a shared mode mutation to the room', async () => {
    const { gateway, playback, socket, emitted } = setup();
    const ack = jest.fn();
    await gateway.mode(socket, { roomId: 'room-1', mode: 'screen', baseVersion: 0 }, ack);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(playback.mutate).toHaveBeenCalledWith('room-1', 'user-1', 0, { mode: 'screen' }, true);
    expect(emitted).toContainEqual(expect.objectContaining({ event: 'player:state' }));
    expect(ack).toHaveBeenCalledWith({ ok: true });
  });

  it('passes host-only control through the service authorization path', async () => {
    const { gateway, playback, socket } = setup(false);
    await gateway.pause(socket, { roomId: 'room-1', baseVersion: 0 });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(playback.mutate).toHaveBeenCalledWith('room-1', 'user-1', 0, { status: 'paused' }, false);
  });
});
