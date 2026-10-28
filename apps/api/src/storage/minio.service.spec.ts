import { ConfigService } from '@nestjs/config';
import { PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';
import type { Environment } from '../config/environment';
import { MinioService } from './minio.service';

describe('MinioService', () => {
  let service: MinioService;
  let send: jest.SpyInstance;

  beforeEach(() => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'MINIO_ENDPOINT') return 'http://localhost:9000';
        if (key === 'MINIO_ACCESS_KEY') return 'test-access';
        if (key === 'MINIO_SECRET_KEY') return 'test-secret';
        if (key === 'MINIO_BUCKET') return 'test-bucket';
        if (key === 'CORS_ORIGINS') return ['http://localhost:3000'];
        return '';
      }),
    } as unknown as ConfigService<Environment, true>;
    service = new MinioService(config);
    send = jest.spyOn(S3Client.prototype, 'send');
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('deletes objects in S3-sized batches', async () => {
    send.mockImplementation(() => Promise.resolve({ Errors: [] }) as never);

    await service.deleteObjects(
      Array.from({ length: 1_001 }, (_, index) => `upload-${index}`),
    );

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('fails account cleanup when the object store reports deletion errors', async () => {
    send.mockImplementation(
      () => Promise.resolve({ Errors: [{ Key: 'upload-1' }] }) as never,
    );

    await expect(service.deleteObjects(['upload-1'])).rejects.toThrow(
      'Could not erase 1 uploaded object(s)',
    );
  });

  it('configures the web origin and signs avatar uploads', async () => {
    const sentCommands: unknown[] = [];
    send.mockImplementation((command: unknown) => {
      sentCommands.push(command);
      return Promise.resolve({}) as never;
    });

    const url = await service.createUploadUrl(
      'avatars/user-1/avatar-id',
      'image/png',
      1024,
    );

    expect(send).toHaveBeenCalledTimes(1);
    expect(sentCommands[0]).toBeInstanceOf(PutBucketCorsCommand);
    expect(url).toContain('X-Amz-Signature=');
    expect(url).toContain('X-Amz-Expires=300');
  });

  it('reads uploaded object metadata for completion validation', async () => {
    send.mockImplementation(
      () =>
        Promise.resolve({
          ContentType: 'image/webp',
          ContentLength: 4096,
        }) as never,
    );

    await expect(
      service.getObjectMetadata('avatars/user-1/avatar-id'),
    ).resolves.toEqual({
      contentType: 'image/webp',
      contentLength: 4096,
    });
  });
});
