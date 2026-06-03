import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '#shared/utils/token';
import { Role } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '#shared/errors/appError';

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
    return next(new UnauthorizedError('Token de autenticação Não fornecido'));
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
    next(new UnauthorizedError('Token de autenticação inválido ou expirado'));
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Usuário não autenticado'));
    }

    if (!roles.includes(req.user.role as Role)) {
      return next(new ForbiddenError('Usuário não tem permissão para acessar este recurso'));
    }

    next();
  };
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader!.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role as Role,
    };
  } catch {}
}
