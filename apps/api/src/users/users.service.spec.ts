import type { PrismaService } from '../prisma/prisma.service';
import type { MinioService } from '../storage/minio.service';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { UsersService } from './users.service';

describe('UsersService account erasure', () => {
  it('removes stored objects before deleting the database account', async () => {
    const operations: string[] = [];
    let erasedKeys: string[] = [];
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          uploads: [{ objectKey: 'user-files/avatar.webp' }],
        }),
        delete: jest.fn(() => {
          operations.push('database');
          return Promise.resolve({});
        }),
      },
    } as unknown as PrismaService;
    const minio = {
      deleteObjects: jest.fn((keys: string[]) => {
        erasedKeys = keys;
        operations.push('object-store');
        return Promise.resolve(undefined);
      }),
    } as unknown as MinioService;
    const service = new UsersService(prisma, minio);

    await service.deleteAccount('user-1');

    expect(erasedKeys).toEqual(['user-files/avatar.webp']);
    expect(operations).toEqual(['object-store', 'database']);
  });

  describe('UsersService avatar uploads', () => {
    const currentUser: AuthenticatedUser = {
      id: 'user-1',
      email: 'date@example.com',
      displayName: 'Avery',
      avatarUrl: null,
      roles: ['user'],
    };

    it('creates an owner-scoped upload and returns its short-lived signed URL', async () => {
      const uploadCreate = jest
        .fn<
          Promise<unknown>,
          [
            {
              data: {
                ownerId: string;
                objectKey: string;
                contentType: string;
                sizeBytes: bigint;
              };
            },
          ]
        >()
        .mockResolvedValue({});
      const prisma = {
        upload: { create: uploadCreate },
      } as unknown as PrismaService;
      const minio = {
        createUploadUrl: jest
          .fn()
          .mockResolvedValue('https://minio.test/signed'),
      } as unknown as MinioService;
      const service = new UsersService(prisma, minio);

      const result = await service.createAvatarUpload(currentUser, {
        contentType: 'image/webp',
        sizeBytes: 1024,
      });

      const createCall = uploadCreate.mock.calls[0];
      if (createCall === undefined) {
        throw new Error('Avatar upload was not recorded.');
      }
      expect(createCall[0].data.ownerId).toBe(currentUser.id);
      expect(createCall[0].data.contentType).toBe('image/webp');
      expect(createCall[0].data.sizeBytes).toBe(BigInt(1024));
      expect(result).toMatchObject({
        uploadUrl: 'https://minio.test/signed',
        expiresIn: 300,
      });
      expect(result.objectKey).toMatch(/^avatars\/user-1\//);
    });

    it('completes an upload only after metadata matches and updates the profile', async () => {
      const storedUpload = {
        id: 'upload-1',
        ownerId: currentUser.id,
        objectKey: 'avatars/user-1/01234567-89ab-cdef-0123-456789abcdef',
        contentType: 'image/png',
        sizeBytes: BigInt(512),
        status: 'PENDING',
        deletedAt: null,
      };
      const updateUpload = jest.fn().mockResolvedValue({});
      const updateUser = jest.fn().mockResolvedValue({
        id: currentUser.id,
        email: currentUser.email,
        displayName: 'Avery',
        avatarUrl: storedUpload.objectKey,
        emailVerifiedAt: new Date(),
      });
      const prisma = {
        upload: { findFirst: jest.fn().mockResolvedValue(storedUpload) },
        $transaction: jest.fn(
          (callback: (transaction: unknown) => Promise<unknown>) =>
            callback({
              upload: { update: updateUpload },
              user: { update: updateUser },
            }),
        ),
      } as unknown as PrismaService;
      const minio = {
        getObjectMetadata: jest
          .fn()
          .mockResolvedValue({ contentType: 'image/png', contentLength: 512 }),
        resolveAvatarUrl: jest
          .fn()
          .mockResolvedValue('https://minio.test/avatar'),
      } as unknown as MinioService;
      const service = new UsersService(prisma, minio);

      const user = await service.completeAvatarUpload(currentUser, {
        objectKey: storedUpload.objectKey,
      });

      expect(updateUpload).toHaveBeenCalledWith({
        where: { id: storedUpload.id },
        data: { status: 'COMPLETE' },
      });
      expect(updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: currentUser.id },
          data: { avatarUrl: storedUpload.objectKey },
        }),
      );
      expect(user.avatarUrl).toBe('https://minio.test/avatar');
    });

    it('rejects an upload with mismatched size or content type', async () => {
      const storedUpload = {
        id: 'upload-1',
        ownerId: currentUser.id,
        objectKey: 'avatars/user-1/01234567-89ab-cdef-0123-456789abcdef',
        contentType: 'image/png',
        sizeBytes: BigInt(512),
        status: 'PENDING',
        deletedAt: null,
      };
      const prisma = {
        upload: { findFirst: jest.fn().mockResolvedValue(storedUpload) },
      } as unknown as PrismaService;
      const minio = {
        getObjectMetadata: jest
          .fn()
          .mockResolvedValue({ contentType: 'image/jpeg', contentLength: 512 }),
      } as unknown as MinioService;
      const service = new UsersService(prisma, minio);

      await expect(
        service.completeAvatarUpload(currentUser, {
          objectKey: storedUpload.objectKey,
        }),
      ).rejects.toThrow('does not match its expected type or size');
    });
  });

  it('keeps the account when uploaded objects cannot be erased', async () => {
    let deleted = false;
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          uploads: [{ objectKey: 'user-files/avatar.webp' }],
        }),
        delete: jest.fn(() => {
          deleted = true;
          return Promise.resolve({});
        }),
      },
    } as unknown as PrismaService;
    const minio = {
      deleteObjects: jest
        .fn()
        .mockRejectedValue(new Error('Object store unavailable')),
    } as unknown as MinioService;
    const service = new UsersService(prisma, minio);

    await expect(service.deleteAccount('user-1')).rejects.toThrow(
      'Object store unavailable',
    );
    expect(deleted).toBe(false);
  });
});
