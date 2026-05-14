export interface UploadedFile {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export interface StorageService {
  upload(file: Express.Multer.File, folder: string): Promise<UploadedFile>;
  delete(key: string): Promise<void>;
}
