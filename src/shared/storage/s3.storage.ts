import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import sharp from 'sharp';
import { StorageService, UploadedFile } from './storage.interface';
import { env } from '#config/env';

export class S3StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.bucket = env.AWS_S3_BUCKET!;
  }

  async upload(file: Express.Multer.File, folder: string): Promise<UploadedFile> {
    const ext = path.extname(file.originalname).toLowerCase();
    const key = `${folder}/${uuidv4()}${ext}`;
    let buffer = file.buffer;
    const isImage = file.mimetype.startsWith('image/');

    if (isImage) {
      buffer = await sharp(file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: isImage ? 'image/webp' : file.mimetype,
        CacheControl: 'max-age=31536000',
      }),
    );

    return {
      url: `https://${this.bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
      key,
      size: buffer.length,
      mimeType: isImage ? 'image/webp' : file.mimetype,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
