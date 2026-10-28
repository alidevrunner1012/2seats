import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../_adapters';

export const REPORT_REASONS = ['harassment', 'nudity', 'spam', 'hate', 'illegal_content', 'other'] as const;

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async report(reporterId: string, d: { targetUserId?: string; messageId?: string; reason: string; details?: string }) {
    if (!d.targetUserId && !d.messageId) throw new BadRequestException('Specify a user or a message');
    if (d.targetUserId === reporterId) throw new BadRequestException('You cannot report yourself');
    return this.prisma.report.create({ data: { reporterId, ...d, details: d.details?.slice(0, 1000) } });
  }
  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new BadRequestException('You cannot block yourself');
    await this.prisma.block.upsert({
      where: { blockerId_blockedUserId: { blockerId, blockedUserId: blockedId } }, update: {}, create: { blockerId, blockedUserId: blockedId },
    });
    return { ok: true };
  }
  async unblock(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedUserId: blockedId } });
    return { ok: true };
  }
  /** Either direction counts. Use in join-room, invite and DM-like events. */
  async isBlockedBetween(a: string, b: string) {
    const n = await this.prisma.block.count({
      where: { OR: [{ blockerId: a, blockedUserId: b }, { blockerId: b, blockedUserId: a }] },
    });
    return n > 0;
  }
  /** Returns the ids in `others` that are blocked with `userId` (for join checks). */
  async blockedAmong(userId: string, others: string[]) {
    if (!others.length) return [];
    const rows = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId, blockedUserId: { in: others } }, { blockedUserId: userId, blockerId: { in: others } }] },
    });
    return rows.map((r) => (r.blockerId === userId ? r.blockedUserId : r.blockerId));
  }

  listReports(status = 'OPEN', cursor?: string) {
    return this.prisma.report.findMany({
      where: { status: status as 'OPEN' }, orderBy: { createdAt: 'desc' }, take: 50,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
  }
  async resolveReport(adminId: string, id: string, status: 'RESOLVED' | 'DISMISSED') {
    const r = await this.prisma.report.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    await this.audit(adminId, `report.${status.toLowerCase()}`, id);
    return this.prisma.report.update({ where: { id }, data: { status, resolvedAt: new Date() } });
  }
  async banUser(adminId: string, userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } }); // kill sessions
    await this.audit(adminId, 'user.ban', userId);
    return { ok: true };
  }
  auditLogs(cursor?: string) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' }, take: 100, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
  }
  private audit(actorId: string, action: string, targetId: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, targetId, entityType: 'Moderation', entityId: targetId } });
  }
}
