import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma, RoomRole } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { randomBytes } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  CursorQueryDto,
  CreateRoomDto,
  JoinRoomDto,
  RoomSettingsDto,
  RoomSummaryDto,
  ScheduleDateDto,
  UpdateScheduleDateDto,
} from './dto/room.dto';
import { MAIL_QUEUE, type MailJob } from '../mail/mail.types';
import type { Environment } from '../config/environment';
import { LiveKitService } from '../livekit/livekit.service';

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_SCOPE = 'room-invite';

interface RoomInvitePayload {
  sub: string;
  scope: typeof INVITE_SCOPE;
}

interface SummaryRoom {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: Date;
  members: Array<{
    role: RoomRole;
    user: { id: string; displayName: string; avatarUrl: string | null };
  }>;
  watchHistory: Array<{ title: string }>;
}

function createInviteCode(): string {
  const bytes = randomBytes(8);
  let value = '';
  for (const byte of bytes) value += INVITE_ALPHABET[byte % INVITE_ALPHABET.length];
  return `${value.slice(0, 4)}-${value.slice(4)}`;
}

function extractInvite(value: string): string {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    return (
      url.searchParams.get('invite') ??
      url.pathname.split('/').pop() ??
      trimmed
    ).toUpperCase();
  } catch {
    return trimmed.toUpperCase();
  }
}

function toSummary(room: SummaryRoom, userId: string): RoomSummaryDto {
  const membership = room.members.find((member) => member.user.id === userId);
  return {
    id: room.id,
    name: room.name,
    inviteCode: room.inviteCode,
    role: membership?.role ?? RoomRole.PARTICIPANT,
    createdAt: room.createdAt.toISOString(),
    members: room.members.map(({ user }) => ({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    })),
    lastMovieTitle: room.watchHistory[0]?.title ?? null,
  };
}

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Environment, true>,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue<MailJob>,
    @Optional() @Inject(forwardRef(() => LiveKitService)) private readonly liveKit?: LiveKitService,
  ) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateRoomDto,
    idempotencyKey?: string,
  ): Promise<RoomSummaryDto> {
    if (idempotencyKey !== undefined) {
      const existing = await this.prisma.room.findFirst({
        where: { createdById: user.id, idempotencyKey, deletedAt: null },
        include: this.roomInclude(),
      });
      if (existing !== null) return toSummary(existing, user.id);
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const room = await this.prisma.room.create({
          data: {
            name: dto.name.trim(),
            inviteCode: createInviteCode(),
            createdById: user.id,
            maxParticipants: dto.maxParticipants ?? 2,
            isPrivate: dto.isPrivate ?? true,
            idempotencyKey,
            members: { create: { userId: user.id, role: RoomRole.HOST } },
          },
          include: this.roomInclude(),
        });
        return toSummary(room, user.id);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < 4
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException('Could not reserve a room invite. Try again.');
  }

  async createInvite(user: AuthenticatedUser, roomId: string): Promise<{ token: string; expiresIn: number }> {
    await this.assertHost(roomId, user.id);
    const token = await this.jwt.signAsync<RoomInvitePayload>(
        { sub: roomId, scope: INVITE_SCOPE },
        {
          expiresIn: '24h',
          secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        },
      );
    await this.audit(user.id, 'ROOM_INVITE_REGENERATED', roomId);
    return {
      token,
      expiresIn: 86_400,
    };
  }

  async joinByToken(user: AuthenticatedUser, token: string): Promise<RoomSummaryDto> {
    let payload: RoomInvitePayload;
    try {
      payload = await this.jwt.verifyAsync<RoomInvitePayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      throw new ForbiddenException('That invite has expired or is invalid.');
    }
    if (payload.scope !== INVITE_SCOPE || payload.sub.length === 0) {
      throw new ForbiddenException('That invite is invalid.');
    }
    return this.joinRoom(user, payload.sub);
  }

  async join(user: AuthenticatedUser, dto: JoinRoomDto): Promise<RoomSummaryDto> {
    const room = await this.prisma.room.findFirst({
      where: { inviteCode: extractInvite(dto.invite), deletedAt: null },
      select: { id: true },
    });
    if (room === null) throw new NotFoundException('That room invite is no longer available.');
    return this.joinRoom(user, room.id);
  }

  private async joinRoom(user: AuthenticatedUser, roomId: string): Promise<RoomSummaryDto> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Room" WHERE id = ${roomId} FOR UPDATE`;
      const room = await tx.room.findFirst({
        where: { id: roomId, deletedAt: null },
        include: this.roomInclude(),
      });
      if (room === null) throw new NotFoundException('That room is not available.');
      const existing = room.members.find((member) => member.user.id === user.id);
      if (existing === undefined && room.members.length >= room.maxParticipants) {
        throw new ConflictException('This room is already full.');
      }
      if (room.locked && existing === undefined) {
        throw new ConflictException('This room is locked by its host.');
      }
      await tx.roomMember.upsert({
        where: { roomId_userId: { roomId, userId: user.id } },
        create: { roomId, userId: user.id, role: RoomRole.PARTICIPANT },
        update: { leftAt: null },
      });
      return toSummary(
        {
          ...room,
          members:
            existing === undefined
              ? [
                  ...room.members,
                  {
                    role: RoomRole.PARTICIPANT,
                    user: {
                      id: user.id,
                      displayName: user.displayName,
                      avatarUrl: user.avatarUrl,
                    },
                  },
                ]
              : room.members,
        },
        user.id,
      );
    });
  }

  async leave(user: AuthenticatedUser, roomId: string): Promise<void> {
    const member = await this.member(roomId, user.id);
    if (member.role === RoomRole.HOST) {
      throw new ForbiddenException('Transfer host before leaving the room.');
    }
    await this.prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId: user.id } },
      data: { leftAt: new Date() },
    });
  }

  async setLocked(user: AuthenticatedUser, roomId: string, locked: boolean): Promise<void> {
    await this.assertHost(roomId, user.id);
    await this.prisma.$transaction([
      this.prisma.room.update({ where: { id: roomId }, data: { locked } }),
      this.prisma.auditLog.create({
        data: { actorId: user.id, action: locked ? 'ROOM_LOCKED' : 'ROOM_UNLOCKED', entityType: 'Room', entityId: roomId },
      }),
    ]);
  }

  async updateSettings(user: AuthenticatedUser, roomId: string, settings: RoomSettingsDto): Promise<void> {
    await this.assertHost(roomId, user.id);
    await this.prisma.room.update({ where: { id: roomId }, data: { ...settings } });
    await this.audit(user.id, 'ROOM_SETTINGS_UPDATED', roomId, { ...settings });
  }

  async kick(user: AuthenticatedUser, roomId: string, memberId: string): Promise<void> {
    await this.assertHost(roomId, user.id);
    if (memberId === user.id) throw new ForbiddenException('A host cannot kick themself.');
    await this.prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId: memberId } },
      data: { leftAt: new Date() },
    });
    await this.liveKit?.removeParticipant(roomId, memberId);
    await this.audit(user.id, 'ROOM_MEMBER_KICKED', roomId, { memberId });
  }

  async transferHost(user: AuthenticatedUser, roomId: string, memberId: string): Promise<void> {
    await this.assertHost(roomId, user.id);
    await this.prisma.$transaction([
      this.prisma.roomMember.update({ where: { roomId_userId: { roomId, userId: user.id } }, data: { role: RoomRole.PARTICIPANT } }),
      this.prisma.roomMember.update({ where: { roomId_userId: { roomId, userId: memberId } }, data: { role: RoomRole.HOST, leftAt: null } }),
      this.prisma.auditLog.create({ data: { actorId: user.id, action: 'ROOM_HOST_TRANSFERRED', entityType: 'Room', entityId: roomId, metadata: { memberId } } }),
    ]);
  }

  async history(user: AuthenticatedUser, roomId: string, query: CursorQueryDto): Promise<{ items: Array<{ id: string; title: string; sourceUrl: string; startedAt: string; endedAt: string | null }>; nextCursor: string | null }> {
    await this.member(roomId, user.id);
    const rows = await this.prisma.watchHistory.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    });
    const hasNext = rows.length > query.limit;
    const items = rows.slice(0, query.limit).map((row) => ({ id: row.id, title: row.title, sourceUrl: row.sourceUrl, startedAt: row.startedAt.toISOString(), endedAt: row.endedAt?.toISOString() ?? null }));
    return { items, nextCursor: hasNext ? items.at(-1)?.id ?? null : null };
  }

  async recent(user: AuthenticatedUser): Promise<RoomSummaryDto[]> {
    const rooms = await this.prisma.room.findMany({
      where: { deletedAt: null, members: { some: { userId: user.id, leftAt: null } } },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      include: this.roomInclude(),
    });
    return rooms.map((room) => toSummary(room, user.id));
  }

  async get(user: AuthenticatedUser, roomId: string): Promise<RoomSummaryDto> {
    await this.member(roomId, user.id);
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, deletedAt: null },
      include: this.roomInclude(),
    });
    if (room === null) throw new NotFoundException('That room is not available.');
    return toSummary(room, user.id);
  }

  async schedule(user: AuthenticatedUser, roomId: string, dto: ScheduleDateDto): Promise<{ id: string; scheduledFor: string; note: string | null }> {
    await this.member(roomId, user.id);
    const scheduledFor = new Date(dto.scheduledFor);
    if (scheduledFor <= new Date()) throw new ConflictException('A date must be in the future.');
    const date = await this.prisma.scheduledDate.create({ data: { roomId, createdById: user.id, scheduledFor, note: dto.note } });
    await this.queueReminder(date.id, roomId, scheduledFor);
    return { id: date.id, scheduledFor: date.scheduledFor.toISOString(), note: date.note };
  }

  async dates(user: AuthenticatedUser, roomId: string): Promise<Array<{ id: string; scheduledFor: string; note: string | null }>> {
    await this.member(roomId, user.id);
    const rows = await this.prisma.scheduledDate.findMany({ where: { roomId }, orderBy: { scheduledFor: 'asc' } });
    return rows.map((row) => ({ id: row.id, scheduledFor: row.scheduledFor.toISOString(), note: row.note }));
  }

  async updateDate(user: AuthenticatedUser, roomId: string, dateId: string, dto: UpdateScheduleDateDto): Promise<void> {
    await this.member(roomId, user.id);
    const date = await this.prisma.scheduledDate.findFirst({
      where: { id: dateId, roomId },
      select: { id: true },
    });
    if (date === null) throw new NotFoundException('That scheduled date is not in this room.');
    await this.prisma.scheduledDate.update({ where: { id: dateId }, data: { scheduledFor: new Date(dto.scheduledFor), note: dto.note, reminderSent: false } });
  }

  async deleteDate(user: AuthenticatedUser, roomId: string, dateId: string): Promise<void> {
    await this.member(roomId, user.id);
    const date = await this.prisma.scheduledDate.findFirst({
      where: { id: dateId, roomId },
      select: { id: true },
    });
    if (date === null) throw new NotFoundException('That scheduled date is not in this room.');
    await this.prisma.scheduledDate.delete({ where: { id: dateId } });
  }

  async nextDate(user: AuthenticatedUser): Promise<{ id: string; roomId: string; scheduledFor: string; note: string | null } | null> {
    const date = await this.prisma.scheduledDate.findFirst({
      where: { scheduledFor: { gt: new Date() }, room: { deletedAt: null, members: { some: { userId: user.id, leftAt: null } } } },
      orderBy: { scheduledFor: 'asc' },
    });
    return date === null ? null : { id: date.id, roomId: date.roomId, scheduledFor: date.scheduledFor.toISOString(), note: date.note };
  }

  async watchHistory(user: AuthenticatedUser, query: CursorQueryDto): Promise<{ items: Array<{ id: string; roomId: string; title: string; startedAt: string; endedAt: string | null }>; nextCursor: string | null }> {
    const rows = await this.prisma.watchHistory.findMany({
      where: { room: { members: { some: { userId: user.id, leftAt: null } }, deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    });
    const items = rows.slice(0, query.limit).map((row) => ({ id: row.id, roomId: row.roomId, title: row.title, startedAt: row.startedAt.toISOString(), endedAt: row.endedAt?.toISOString() ?? null }));
    return { items, nextCursor: rows.length > query.limit ? items.at(-1)?.id ?? null : null };
  }

  private async member(roomId: string, userId: string): Promise<{ role: RoomRole }> {
    const member = await this.prisma.roomMember.findFirst({ where: { roomId, userId, leftAt: null }, select: { role: true } });
    if (member === null) throw new ForbiddenException('An active room membership is required');
    return member;
  }

  private async assertHost(roomId: string, userId: string): Promise<void> {
    const member = await this.member(roomId, userId);
    if (member.role !== RoomRole.HOST) throw new ForbiddenException('Room host access is required');
  }

  private async audit(actorId: string, action: string, roomId: string, metadata?: Prisma.InputJsonValue): Promise<void> {
    await this.prisma.auditLog.create({ data: { actorId, action, entityType: 'Room', entityId: roomId, metadata } });
  }

  private async queueReminder(dateId: string, roomId: string, scheduledFor: Date): Promise<void> {
    const delay = Math.max(0, scheduledFor.getTime() - Date.now() - 3_600_000);
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          where: { leftAt: null },
          include: { user: { select: { email: true } } },
        },
      },
    });
    if (room === null) return;
    await Promise.all(
      room.members.map(({ user }) =>
        this.mailQueue.add(
          'scheduled-date-reminder',
          {
            to: user.email,
            subject: 'Your 2Seats date is almost here',
            title: 'Your seats are waiting',
            message:
              'Your date begins in one hour. The best seat is still next to yours.',
            actionLabel: 'Open your room',
            actionUrl: `/rooms/${roomId}`,
          },
          {
            delay,
            jobId: `scheduled-date-${dateId}-${user.email}`,
            removeOnComplete: 500,
          },
        ),
      ),
    );
  }

  private roomInclude() {
    return {
      members: { where: { leftAt: null }, include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } },
      watchHistory: { orderBy: { startedAt: 'desc' as const }, take: 1, select: { title: true } },
    };
  }
}
