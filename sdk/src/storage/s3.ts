import type { StorageBackend, S3StorageConfig } from '../types';
import { logger } from '../logger';

export class S3Storage implements StorageBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private s3: any = null;
  private bucket: string;
  private prefix: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.prefix = config.prefix || 'hippocampus/memories/';

    // Ensure prefix ends with /
    if (this.prefix && !this.prefix.endsWith('/')) {
      this.prefix += '/';
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async ensureClient(): Promise<any> {
    if (this.s3) {
      return this.s3;
    }

    const { S3Client } = await import('@aws-sdk/client-s3');
    this.s3 = new S3Client({});

    logger.info('S3 storage initialized', {
      bucket: this.bucket,
      prefix: this.prefix,
    });
    return this.s3;
  }

  private objectKey(ownerId: string): string {
    return `${this.prefix}${ownerId}`;
  }

  async get(ownerId: string): Promise<string | null> {
    try {
      const s3 = await this.ensureClient();
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');

      const response = await s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: this.objectKey(ownerId),
        }),
      );
      return (await response.Body?.transformToString('utf-8')) ?? null;
    } catch (error: unknown) {
      // NoSuchKey = ownerId not found — not an error
      if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey') {
        return null;
      }
      logger.error('S3 get failed', {
        ownerId,
        bucket: this.bucket,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async set(ownerId: string, memory: string): Promise<void> {
    try {
      const s3 = await this.ensureClient();
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');

      await s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.objectKey(ownerId),
          Body: memory,
          ContentType: 'text/plain; charset=utf-8',
        }),
      );
    } catch (error) {
      logger.error('S3 set failed', {
        ownerId,
        bucket: this.bucket,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async delete(ownerId: string): Promise<void> {
    try {
      const s3 = await this.ensureClient();
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

      await s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: this.objectKey(ownerId),
        }),
      );
    } catch (error) {
      logger.error('S3 delete failed', {
        ownerId,
        bucket: this.bucket,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async close(): Promise<void> {
    try {
      if (this.s3) {
        this.s3.destroy?.();
        this.s3 = null;
        logger.info('S3 storage closed');
      }
    } catch (error) {
      logger.error('S3 close failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.s3 = null;
    }
  }
}
