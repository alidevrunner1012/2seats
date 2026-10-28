import { Injectable } from '@nestjs/common';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly bucket = process.env.S3_BUCKET ?? '2seats-uploads';
  private readonly s3 = new S3Client({
    region: process.env.S3_REGION ?? 'auto',
    endpoint: process.env.S3_ENDPOINT, // MinIO in dev, R2/S3 in prod
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: process.env.S3_ACCESS_KEY
      ? { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY ?? '' }
      : undefined,
  });

  presignPut(key: string, mime: string, size: number): Promise<string> {
    // ContentType + ContentLength are signed, so the client cannot upload a different type/size.
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mime, ContentLength: size }),
      { expiresIn: 300 },
    );
  }
  presignGet(key: string): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: 600 });
  }
  async head(key: string): Promise<{ size: number; mime?: string } | null> {
    try {
      const r = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { size: r.ContentLength ?? 0, mime: r.ContentType };
    } catch { return null; }
  }
  async remove(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })).catch(() => undefined);
  }
}
