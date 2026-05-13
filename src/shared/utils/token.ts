import jwt from 'jsonwebtoken';
import { env } from '#config/env';
import { randomUUID } from 'crypto';

export interface TokenPayload {
  sub: string;
  role: string;
  type: 'access' | 'refresh';
  jti?: string;
}

export function generateAccessToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role, type: 'access' } as TokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function generateRefreshToken(userId: string, role: string): string {
  return jwt.sign(
    { sub: userId, role, type: 'refresh', jti: randomUUID() } as TokenPayload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions,
  );
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}
