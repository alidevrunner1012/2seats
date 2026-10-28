import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../_adapters';
import { StorageService } from './storage.service';
import { VIRUS_SCANNER, VirusScanner } from './scan';
import { extFor, validateUpload, wouldExceedQuota } from './uploads.rules';

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(VIRUS_SCANNER) private readonly scanner: VirusScanner,
  ) {}

  async presign(userId: string, kind: string, mime: string, size: number) {
    const err = validateUpload(kind, mime, size);
    if (err) throw new BadRequestException(err);

    const agg = await this.prisma.upload.aggregate({
      where: { ownerId: userId, status: { in: ['PENDING', 'COMPLETE'] } },
      _sum: { sizeBytes: true },
    });
    if (wouldExceedQuota(Number(agg._sum?.sizeBytes ?? 0n), size)) throw new ForbiddenException('Upload quota exceeded');

    const key = `${kind}/${userId}/${randomUUID()}${extFor(mime)}`; // random, never user-controlled
    const upload = await this.prisma.upload.create({ data: { ownerId: userId, objectKey: key, contentType: mime, sizeBytes: BigInt(size) } });
    const url = await this.storage.presignPut(key, mime, size);
    return { id: upload.id, uploadUrl: url, headers: { 'Content-Type': mime }, expiresInSec: 300 };
  }

  async confirm(userId: string, id: string) {
    const up = await this.prisma.upload.findUnique({ where: { id } });
    if (!up || up.ownerId !== userId) throw new NotFoundException();
    if (up.status === 'COMPLETE') return { id, status: 'READY' };
    const head = await this.storage.head(up.objectKey);
    if (!head) throw new BadRequestException('Object not found, upload first');
    if (head.size !== Number(up.sizeBytes)) {
      await this.reject(up.id, up.objectKey);
      throw new BadRequestException('Size mismatch');
    }
    const scan = await this.scanner.scan(up.objectKey);
    if (!scan.clean) {
      await this.reject(up.id, up.objectKey);
      throw new BadRequestException(scan.reason ?? 'File rejected');
    }
    await this.prisma.upload.update({ where: { id }, data: { status: 'COMPLETE' } });
    return { id, status: 'READY' };
  }

  async readUrl(userId: string, id: string) {
    const up = await this.prisma.upload.findUnique({ where: { id } });
    // Owner-only for now; widen to room members when attaching uploads to messages.
    if (!up || up.status !== 'COMPLETE' || up.ownerId !== userId) throw new NotFoundException();
    return { url: await this.storage.presignGet(up.objectKey) };
  }

  async cleanupPending(olderThanMs = 60 * 60 * 1000): Promise<number> {
    const stale = await this.prisma.upload.findMany({
      where: { status: 'PENDING', createdAt: { lt: new Date(Date.now() - olderThanMs) } },
      take: 500,
    });
    for (const u of stale) {
      await this.storage.remove(u.objectKey);
      await this.prisma.upload.delete({ where: { id: u.id } });
    }
    return stale.length;
  }

  private async reject(id: string, key: string) {
    await this.storage.remove(key);
    await this.prisma.upload.update({ where: { id }, data: { status: 'FAILED' } });
  }
}
