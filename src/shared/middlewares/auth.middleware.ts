import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '#shared/utils/token';
import { Role } from '#prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next({ status: 401, message: 'Token de autenticação ausente ou mal formatado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role as Role,
    };

    next();
  } catch {
    next({ status: 401, message: 'Token de autenticação inválido ou expirado' });
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next({ status: 401, message: 'Usuário não autenticado' });
    }

    if (!roles.includes(req.user.role as Role)) {
      return next({ status: 403, message: 'Usuário não autorizado para acessar este recurso' });
    }

    next();
  };
}
