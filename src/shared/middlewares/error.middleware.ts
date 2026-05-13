import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '#shared/errors/appError';
import { logger } from '#shared/utils/logger';
import { env } from '#config/env';

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Erros de validação do Zod
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    err.issues.forEach((e) => {
      const key = e.path.join('.');
      if (!errors[key]) errors[key] = [];
      errors[key].push(e.message);
    });

    res.status(422).json({
      status: 'error',
      message: 'Dados inválidos',
      errors,
    });
    return;
  }

  // Erros de validação customizados
  if (err instanceof ValidationError) {
    res.status(422).json({
      status: 'error',
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  // Erros operacionais conhecidos
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Erros inesperados
  logger.error('Erro não tratado:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    status: 'error',
    message: env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
