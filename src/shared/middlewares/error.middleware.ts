import { ErrorRequestHandler, Request, Response } from 'express';
import { ZodError } from 'zod';

export async function errorMiddleware(error: ErrorRequestHandler, _: Request, res: Response) {
  if (error instanceof ZodError) {
    const errors = error.issues.map((issue) => {
      return {
        path: issue.path.join('.'),
        message: issue.message,
      };
    });
    return res.status(400).send({
      status: 'Validation error',
      errors,
    });
  }
}
