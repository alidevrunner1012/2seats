/**
 * ONE place that connects the new modules to YOUR existing code.
 * Fix these import paths to match your repo; nothing else needs editing.
 * Assumptions:
 *  - RedisService exposes `.client` (an ioredis instance)
 *  - JwtAuthGuard puts `{ id, displayName? }` on request.user (read via @CurrentUser())
 *  - RoomMemberGuard reads the `:roomId` route param
 *  - Socket.IO handshake sets `socket.data.userId`, and sockets join `room:{roomId}`
 */
export { PrismaService } from './prisma/prisma.service';
export { RedisService } from './redis/redis.service';
export { JwtAuthGuard } from './auth/jwt-auth.guard';
export { CurrentUser } from './auth/current-user.decorator';
export { RoomMemberGuard } from './rooms/room-member.guard';
export { RolesGuard } from './auth/roles.guard';
export { Roles } from './auth/roles.decorator';
export type AuthUser = { id: string; displayName?: string };
