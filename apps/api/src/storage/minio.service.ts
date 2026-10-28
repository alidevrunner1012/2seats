import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  PutBucketCorsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';

const MAX_DELETE_BATCH_SIZE = 1_000;

@Injectable()
export class MinioService implements OnModuleDestroy {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly corsOrigins: string[];
  private corsConfiguration: Promise<void> | null = null;

  constructor(config: ConfigService<Environment, true>) {
    this.client = new S3Client({
      endpoint: config.get('MINIO_ENDPOINT', { infer: true }),
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.get('MINIO_ACCESS_KEY', { infer: true }),
        secretAccessKey: config.get('MINIO_SECRET_KEY', { infer: true }),
      },
    });
    this.bucket = config.get('MINIO_BUCKET', { infer: true });
    this.corsOrigins = config.get('CORS_ORIGINS', { infer: true });
  }

  async deleteObjects(objectKeys: string[]): Promise<void> {
    for (
      let offset = 0;
      offset < objectKeys.length;
      offset += MAX_DELETE_BATCH_SIZE
    ) {
      const response = await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: objectKeys
              .slice(offset, offset + MAX_DELETE_BATCH_SIZE)
              .map((Key) => ({ Key })),
            Quiet: false,
          },
        }),
        { abortSignal: AbortSignal.timeout(15_000) },
      );
      if (response.Errors !== undefined && response.Errors.length > 0) {
        throw new Error(
          `Could not erase ${response.Errors.length} uploaded object(s)`,
        );
      }
    }
  }

  async createUploadUrl(
    objectKey: string,
    contentType: string,
    contentLength: number,
  ): Promise<string> {
    await this.configureUploadCors();
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: contentType,
        ContentLength: contentLength,
      }),
      { expiresIn: 300 },
    );
  }

  private async configureUploadCors(): Promise<void> {
    if (this.corsConfiguration === null) {
      this.corsConfiguration = this.client
        .send(
          new PutBucketCorsCommand({
            Bucket: this.bucket,
            CORSConfiguration: {
              CORSRules: [
                {
                  AllowedOrigins: this.corsOrigins,
                  AllowedMethods: ['PUT', 'GET', 'HEAD'],
                  AllowedHeaders: ['*'],
                  ExposeHeaders: ['ETag'],
                  MaxAgeSeconds: 3_600,
                },
              ],
            },
          }),
          { abortSignal: AbortSignal.timeout(15_000) },
        )
        .then(() => undefined);
    }
    await this.corsConfiguration;
  }

  async createDownloadUrl(objectKey: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      { expiresIn: 3_600 },
    );
  }

  async getObjectMetadata(objectKey: string): Promise<{
    contentType: string | undefined;
    contentLength: number | undefined;
  }> {
    const result = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      { abortSignal: AbortSignal.timeout(15_000) },
    );
    return {
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }

  async resolveAvatarUrl(avatarUrl: string | null): Promise<string | null> {
    if (avatarUrl === null || avatarUrl.includes('://')) return avatarUrl;
    return this.createDownloadUrl(avatarUrl);
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }
}
