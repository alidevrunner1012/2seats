import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UploadStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import type { SafeUser } from '../auth/auth.service';
import { MinioService } from '../storage/minio.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type {
  AvatarUploadResponse,
  CompleteAvatarUploadDto,
  CreateAvatarUploadDto,
} from './dto/avatar-upload.dto';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async updateProfile(
    currentUser: AuthenticatedUser,
    dto: UpdateProfileDto,
  ): Promise<SafeUser> {
    const user = await this.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(dto.displayName === undefined
          ? {}
          : { displayName: dto.displayName.trim() }),
        ...(dto.avatarUrl === undefined ? {} : { avatarUrl: dto.avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        emailVerifiedAt: true,
      },
    });
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: await this.minio.resolveAvatarUrl(user.avatarUrl),
      emailVerified: user.emailVerifiedAt !== null,
    };
  }

  async createAvatarUpload(
    currentUser: AuthenticatedUser,
    dto: CreateAvatarUploadDto,
  ): Promise<AvatarUploadResponse> {
    if (dto.sizeBytes > MAX_AVATAR_BYTES) {
      throw new BadRequestException('Avatar images must be 5 MB or smaller');
    }
    const objectKey = `avatars/${currentUser.id}/${randomUUID()}`;
    await this.prisma.upload.create({
      data: {
        ownerId: currentUser.id,
        objectKey,
        contentType: dto.contentType,
        sizeBytes: BigInt(dto.sizeBytes),
      },
    });
    const uploadUrl = await this.minio.createUploadUrl(
      objectKey,
      dto.contentType,
      dto.sizeBytes,
    );
    return { uploadUrl, objectKey, expiresIn: 300 };
  }

  async completeAvatarUpload(
    currentUser: AuthenticatedUser,
    dto: CompleteAvatarUploadDto,
  ): Promise<SafeUser> {
    const upload = await this.prisma.upload.findFirst({
      where: {
        ownerId: currentUser.id,
        objectKey: dto.objectKey,
        status: UploadStatus.PENDING,
        deletedAt: null,
      },
    });
    if (upload === null) {
      throw new NotFoundException('Avatar upload was not found or has expired');
    }
    const uploaded = await this.minio.getObjectMetadata(upload.objectKey);
    if (
      uploaded.contentLength !== Number(upload.sizeBytes) ||
      uploaded.contentType !== upload.contentType
    ) {
      throw new BadRequestException(
        'The uploaded avatar does not match its expected type or size',
      );
    }
    const user = await this.prisma.$transaction(async (transaction) => {
      await transaction.upload.update({
        where: { id: upload.id },
        data: { status: UploadStatus.COMPLETE },
      });
      return transaction.user.update({
        where: { id: currentUser.id },
        data: { avatarUrl: upload.objectKey },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          emailVerifiedAt: true,
        },
      });
    });
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: await this.minio.resolveAvatarUrl(user.avatarUrl),
      emailVerified: user.emailVerifiedAt !== null,
    };
  }

  async exportData(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        createdRooms: {
          select: { id: true, name: true, inviteCode: true, createdAt: true },
        },
        roomMemberships: {
          select: {
            roomId: true,
            role: true,
            joinedAt: true,
            leftAt: true,
            room: {
              select: {
                id: true,
                name: true,
                watchHistory: {
                  select: {
                    id: true,
                    title: true,
                    sourceUrl: true,
                    startedAt: true,
                    endedAt: true,
                    participants: true,
                  },
                },
              },
            },
          },
        },
        createdBrowserSessions: {
          select: {
            id: true,
            roomId: true,
            expiresAt: true,
            createdAt: true,
          },
        },
        messages: {
          select: { id: true, roomId: true, content: true, createdAt: true },
        },
        reactions: {
          select: { messageId: true, emoji: true, createdAt: true },
        },
        uploads: {
          select: {
            id: true,
            objectKey: true,
            contentType: true,
            sizeBytes: true,
            status: true,
            createdAt: true,
          },
        },
        submittedReports: {
          select: {
            id: true,
            reportedUserId: true,
            messageId: true,
            reason: true,
            details: true,
            status: true,
            createdAt: true,
          },
        },
        receivedReports: {
          select: {
            id: true,
            reporterId: true,
            messageId: true,
            reason: true,
            details: true,
            status: true,
            createdAt: true,
          },
        },
        blocksMade: {
          select: { blockedUserId: true, createdAt: true },
        },
        blocksReceived: {
          select: { blockerId: true, createdAt: true },
        },
        auditLogs: {
          select: {
            action: true,
            entityType: true,
            entityId: true,
            metadata: true,
            createdAt: true,
          },
        },
        scheduledDates: {
          select: {
            id: true,
            roomId: true,
            scheduledFor: true,
            note: true,
            reminderSent: true,
            createdAt: true,
          },
        },
      },
    });
    if (user === null) throw new NotFoundException('Account was not found');
    return {
      exportedAt: new Date().toISOString(),
      user: {
        ...user,
        uploads: user.uploads.map((upload) => ({
          ...upload,
          sizeBytes: upload.sizeBytes.toString(),
        })),
      },
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { uploads: { select: { objectKey: true } } },
      });
      if (user === null) {
        throw new NotFoundException('Account was not found');
      }
      await this.minio.deleteObjects(
        user.uploads.map((upload) => upload.objectKey),
      );
      await this.prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Account was not found');
      }
      throw error;
    }
  }
}
