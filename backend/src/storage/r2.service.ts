import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const r2 = this.config.get<{
      bucketName: string;
      publicUrl: string;
      endpoint: string;
      accessKeyId: string;
      secretAccessKey: string;
    }>('r2')!;

    this.bucket = r2.bucketName;
    this.publicUrl = r2.publicUrl.replace(/\/$/, '');
    this.client = new S3Client({
      region: 'auto',
      endpoint: r2.endpoint,
      credentials: {
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      },
    });
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return `${this.publicUrl}/${key}`;
  }

  async deleteByUrl(publicUrl: string): Promise<void> {
    try {
      const key = this.extractKeyFromUrl(publicUrl);
      if (!key) {
        this.logger.warn(`Could not extract key from URL: ${publicUrl}`);
        return;
      }
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete R2 object: ${msg}`);
    }
  }

  private extractKeyFromUrl(url: string): string | null {
    if (!url.startsWith(this.publicUrl)) return null;
    return url.substring(this.publicUrl.length + 1);
  }
}
