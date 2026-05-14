import multer from 'multer';
import { AppError } from '#shared/errors/appError';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
    files: 10,
  },
  fileFilter(_req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Tipo de arquivo não permitido. Use: ${ALLOWED_TYPES.join(', ')}`, 415));
    }
  },
});
