import { StorageService } from './storage.interface';
import { LocalStorageService } from './local.storage';
import { S3StorageService } from './s3.storage';
import { env } from '#config/env';

export const storageService: StorageService =
  env.STORAGE_TYPE === 's3' ? new S3StorageService() : new LocalStorageService();
