import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageService, UploadedFile } from './storage.interface';
import { env } from '#config/env';

export class LocalStorageService implements StorageService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(env.UPLOAD_DIR);
  }
  async upload(file: Express.Multer.File, folder: string): Promise<UploadedFile> {
    const dir = path.join(this.uploadDir, folder);
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(file.originalname);
    const key = `${folder}/${uuidv4()}${ext}`;
    const dest = path.join(this.uploadDir, key);

    await fs.writeFile(dest, file.buffer);

    return {
      url: `${env.APP_URL}/${this.uploadDir}/${key}`,
      key,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    await fs.unlink(filePath).catch(() => {});
  }
}
