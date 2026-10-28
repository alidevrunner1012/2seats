/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { BrowserControlService, ControlState } from './browser-control.service';

const base = z.object({ roomId: z.string().min(1).max(64) });
const grant = base.extend({ to: z.string().min(1).max(64) });
type Ack = { ok: true; state: ControlState } | { ok: false; error: string };

@WebSocketGateway()
export class BrowserControlGateway {
  @WebSocketServer() server!: Server;
  constructor(private readonly control: BrowserControlService) {}

  private authorize(s: Socket, roomId: string): string | null {
    const userId = s.data?.userId as string | undefined;
    return userId && s.rooms.has(`room:${roomId}`) ? userId : null;
  }
  private async run<T extends { roomId: string }>(
    s: Socket, schema: z.ZodType<T>, body: unknown, fn: (userId: string, p: T) => Promise<ControlState>,
  ): Promise<Ack> {
    const parsed = schema.safeParse(body);
    if (!parsed.success) return { ok: false, error: 'bad payload' };
    const userId = this.authorize(s, parsed.data.roomId);
    if (!userId) return { ok: false, error: 'forbidden' };
    const state = await fn(userId, parsed.data);
    this.server.to(`room:${parsed.data.roomId}`).emit('browser:control-state', state);
    return { ok: true, state };
  }

  @SubscribeMessage('browser:request-control')
  request(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.run(s, base, b, (u, p) => this.control.request(p.roomId, u));
  }
  @SubscribeMessage('browser:release-control')
  release(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.run(s, base, b, (u, p) => this.control.release(p.roomId, u));
  }
  @SubscribeMessage('browser:grant-control')
  grantControl(@ConnectedSocket() s: Socket, @MessageBody() b: unknown) {
    return this.run(s, grant, b, (u, p) => this.control.grant(p.roomId, u, p.to));
  }
}
