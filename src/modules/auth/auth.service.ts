import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { addDays, addMinutes } from 'date-fns';
import { prisma } from '#config/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '#shared/utils/token';
import type {
  RegisterInput,
  LoginInput,
  ForgotPassword,
  ResetPassword,
} from '#modules/auth/auth.schema';

const BCRYPT_SALT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_DAYS = 7;
const RESET_TOKEN_TTL_MINUTES = 30;

const blackListKey = (token: string) => `blacklist:${token}`;

export class AuthService {
  async register(data: RegisterInput) {
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) {
      return { status: 400, message: 'E-mail já cadastrado' };
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

    const { accessToken, refreshToken } = await this.createToken(user.id, user.role);

    return { user, accessToken, refreshToken };
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user?.isActive) {
      return { status: 400, message: 'E-mail ou senha inválidos' };
    }

    const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordMatch) {
      return { status: 400, message: 'E-mail ou senha inválidos' };
    }

    const { accessToken, refreshToken } = await this.createToken(user.id, user.role);

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

  async refreshToken(token: string) {
    try {
      verifyRefreshToken(token);
    } catch {
      return { status: 401, message: 'Refresh token inválido ou expirado' };
    }
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, role: true, isActive: true } } },
    });

    if (!storedToken?.user?.isActive) {
      return { status: 401, message: 'Refresh token inválido' };
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { token } });
      return { status: 401, message: 'Refresh token expirado, faça login novamente' };
    }

    await prisma.refreshToken.delete({ where: { token } });

    const { accessToken, refreshToken: newRefreshToken } = await this.createToken(
      storedToken.user.id,
      storedToken.user.role,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  private async createToken(userId: string, role: string) {
    const accessToken = generateAccessToken(userId, role);
    const refreshToken = generateRefreshToken(userId, role);

    const expiresAt = addDays(new Date(), REFRESH_TOKEN_TTL_DAYS);

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
