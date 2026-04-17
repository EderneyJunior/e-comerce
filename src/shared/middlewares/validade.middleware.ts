import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

type ValidateTarget = 'body' | 'params' | 'query';

export function validate(schema: ZodType, target: ValidateTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(result.error);
    }
    req[target] = result.data;
    next();
  };
}
