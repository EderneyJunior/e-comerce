import { prisma } from '#config/prisma';
import bcrypt from 'bcrypt';
import type { UpdateProfileInput, ChangePasswordInput, AddressInput } from './user.schema';
import { NotFoundError, UnauthorizedError } from '#shared/errors/appError';

export class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        addresses: true,
      },
    });

    if (!user) throw new NotFoundError('Usuário não encontrado');

    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name: data.name },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    return user;
  }

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Usuário não encontrado');

    const match = await bcrypt.compare(data.currentPassword, user.passwordHash);

    if (!match) throw new UnauthorizedError('Senha atual incorreta');

    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async listAddresses(userId: string) {
    return await prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
  }

  async addAddress(userId: string, data: AddressInput) {
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return await prisma.address.create({ data: { ...data, userId } });
  }

  async updateAddress(addressId: string, userId: string, data: Partial<AddressInput>) {
    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });

    if (!address) throw new NotFoundError('Endereço não encontrado');

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return await prisma.address.update({
      where: { id: addressId },
      data,
    });
  }

  async deleteAddress(addressId: string, userId: string) {
    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });

    if (!address) throw new NotFoundError('Endereço não encontrado');
    await prisma.address.delete({ where: { id: addressId } });
  }

  async listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        skip,
        take: limit,
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    if (!user) throw new NotFoundError('Usuário não encontrado');
    return user;
  }

  async toggleUserStatus(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('Usuário não encontrado');

    return await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });
  }
}

export const userService = new UserService();
