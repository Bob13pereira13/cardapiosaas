import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';

@Injectable()
export class UploadService {
  private readonly s3 =
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
      ? new S3Client({
          region: 'auto',
          endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
          },
        })
      : null;

  async upload(file: Express.Multer.File) {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;

    if (this.s3 && process.env.R2_BUCKET) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: filename,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      const publicBase =
        process.env.R2_PUBLIC_URL ??
        `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;
      return { url: `${publicBase.replace(/\/$/, '')}/${filename}` };
    }

    const uploadDir = process.env.UPLOADS_DIR || './uploads';
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), file.buffer);
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    return { url: `${apiUrl.replace(/\/$/, '')}/uploads/${filename}` };
  }
}
