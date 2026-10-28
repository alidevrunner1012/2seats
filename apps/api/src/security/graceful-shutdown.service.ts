import { BeforeApplicationShutdown, Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

/** In your gateway's afterInit(server): `shutdown.register(server)`. */
@Injectable()
export class GracefulShutdownService implements BeforeApplicationShutdown {
  private readonly log = new Logger('Shutdown');
  private io?: Server;
  register(io: Server) { this.io = io; }
  async beforeApplicationShutdown(signal?: string) {
    if (!this.io) return;
    this.log.log(`${signal ?? 'shutdown'}: draining sockets`);
    this.io.emit('server:restarting', { reconnectInMs: 2000 }); // clients auto-reconnect to another pod
    await new Promise((r) => setTimeout(r, 2000));
    this.io.disconnectSockets(true);
    await this.io.close();
  }
}
