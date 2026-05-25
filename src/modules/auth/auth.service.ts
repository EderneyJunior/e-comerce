import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { addDays, addMinutes } from 'date-fns';
import { prisma } from '#config/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '#shared/utils/token';
import type {
  RegisterInput,
  LoginInput,
  ForgotPassword,
  ResetPassword,
} from '#modules/auth/auth.schema';
import { UnauthorizedError, ConflictError, AppError } from '#shared/errors/appError';

const BCRYPT_SALT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_DAYS = 7;
const RESET_TOKEN_TTL_MINUTES = 30;
export class AuthService {
  async register(data: RegisterInput) {
    console.log('Register');
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) {
      throw new ConflictError('E-mail já registrado');
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('Erro ao criar usuário', 400);
    }

    const { accessToken, refreshToken } = await this.createTokenPair(user.id, user.role);

    return { user, accessToken, refreshToken };
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new UnauthorizedError('E-mail ou senha inválidos');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Usuário inativo');
    }

    const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedError('E-mail ou senha inválidos');
    }

    const { accessToken, refreshToken } = await this.createTokenPair(user.id, user.role);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(token: string) {
    let payload;

    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedError('Refresh token inválido ou expirado');
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, role: true, isActive: true } } },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Token inválido');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedError('Usuário inativo');
    }

    if (payload.sub !== storedToken.user.id) {
      throw new UnauthorizedError('Token inválido');
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { token } });
      throw new UnauthorizedError('Refresh token expirado');
    }

    await prisma.refreshToken.delete({ where: { token } });

    const { accessToken, refreshToken: newRefreshToken } = await this.createTokenPair(
      storedToken.user.id,
      storedToken.user.role,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(token: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token } });

    if (stored) {
      await prisma.refreshToken.delete({ where: { token } });
    }
  }

  async forgotPassword(data: ForgotPassword) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) return;

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = randomBytes(32).toString('hex');
    const expiresAt = addMinutes(new Date(), RESET_TOKEN_TTL_MINUTES);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });
    return token;
  }

  async resetPassword(data: ResetPassword) {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: data.token },
      include: { user: true },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new AppError('Token inválido ou já utilizado', 400);
    }

    if (resetToken.usedAt) {
      throw new AppError('Token já utilizado', 400);
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { token: data.token },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } }),
    ]);
  }

  private async createTokenPair(userId: string, role: string) {
    const accessToken = generateAccessToken(userId, role);
    const refreshToken = generateRefreshToken(userId, role);

    const expiresAt = addDays(new Date(), REFRESH_TOKEN_TTL_DAYS);

    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      throw new AppError('Usuário não encontrado para criar token', 400);
    }

    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
