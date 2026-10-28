import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { io as connect, type Socket as ClientSocket } from 'socket.io-client';
import { PlaybackGateway } from './playback.gateway';
import type { PlaybackService } from './playback.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('PlaybackGateway socket convergence', () => {
  let httpServer: HttpServer;
  let ioServer: Server;
  let first: ClientSocket;
  let second: ClientSocket;

  afterEach((done) => {
    first?.disconnect();
    second?.disconnect();
    void ioServer.close(() => {
      httpServer.close(() => {
        done();
      });
    });
  });

  it('delivers one authoritative mode state to two connected clients', async () => {
    let version = 0;
    const playback = {
      mutate: jest.fn().mockImplementation(() => ({
        mode: 'screen',
        source: null,
        status: 'paused',
        position: 0,
        rate: 1,
        updatedAt: Date.now(),
        version: ++version,
      })),
    } as unknown as PlaybackService;
    const gateway = new PlaybackGateway(
      playback,
      { room: { findUnique: jest.fn().mockResolvedValue({ everyoneCanControl: true }) } } as unknown as PrismaService,
    );
    httpServer = createServer();
    ioServer = new Server(httpServer);
    const namespace = ioServer.of('/socket');
    gateway.server = namespace as never;
    namespace.on('connection', (socket) => {
      void socket.join('room:room-1');
      socket.data = { user: { id: socket.id }, roomIds: new Set(['room-1']) };
      socket.on('room:set-mode', (body, ack) => {
        // Socket.IO's untyped event listener is narrowed at the gateway boundary.
        void gateway.mode(socket as never, body, ack as never);
      });
    });
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    if (address === null || typeof address === 'string') throw new Error('Test server did not start');
    const url = `http://127.0.0.1:${address.port}/socket`;
    first = connect(url);
    second = connect(url);
    await Promise.all([once(first, 'connect'), once(second, 'connect')]);
    const received = Promise.all([once(first, 'player:state'), once(second, 'player:state')]);

    first.emit('room:set-mode', { roomId: 'room-1', mode: 'screen', baseVersion: 0 }, () => undefined);
    const states = await received;

    expect(states[0]).toMatchObject({ mode: 'screen', version: 1 });
    expect(states[1]).toMatchObject({ mode: 'screen', version: 1 });
  });
});

function once(socket: ClientSocket, event: string): Promise<Record<string, unknown>> {
  return new Promise((resolve) => socket.once(event, (payload: Record<string, unknown>) => resolve(payload)));
}
