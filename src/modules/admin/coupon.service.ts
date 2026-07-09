import { z } from 'zod';
import { prisma } from '#config/prisma';
import { NotFoundError, ConflictError } from '#shared/errors/appError';

export const couponAdminSchema = z.object({
  code: z.string().min(3).max(50).trim().toUpperCase(),
  description: z.string().max(200).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']),
  discountValue: z.coerce.number().min(0),
  minOrderValue: z.coerce.number().min(0).optional().nullable(),
  maxUsage: z.coerce.number().int().min(1).optional().nullable(),
  maxUsagePerUser: z.coerce.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  expiresAt: z.coerce.date().optional().nullable(),
});

export type CouponAdminInput = z.infer<typeof couponAdminSchema>;

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CouponAdminService {
  async list(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [coupons, total] = await prisma.$transaction([
      prisma.coupon.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { carts: true, orderCoupons: true } },
        },
      }),
      prisma.coupon.count(),
    ]);

    return {
      data: coupons.map((c) => ({
        ...c,
        discountValue: Number(c.discountValue),
        minOrderValue: c.minOrderValue ? Number(c.minOrderValue) : null,
        usageCount: c.usageCount,
        activeCarts: c._count.carts,
        totalOrdersUsed: c._count.orderCoupons,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(data: CouponAdminInput) {
    await this.assertCodeNotDuplicate(data.code);

    return prisma.coupon.create({ data });
  }

  async update(id: string, data: Partial<CouponAdminInput>) {
    const coupon = await this.findOrThrow(id);

    if (data.code && data.code !== coupon.code) {
      await this.assertCodeNotDuplicate(data.code);
    }

    return prisma.coupon.update({ where: { id }, data });
  }

  async delete(id: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { orderCoupons: true } } },
    });

    if (!coupon) throw new NotFoundError('Cupom não encontrado');

    if (coupon._count.orderCoupons > 0) {
      return prisma.coupon.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return prisma.coupon.delete({ where: { id } });
  }

  private async findOrThrow(id: string) {
    const coupon = await prisma.coupon.findUnique({ where: { id } });

    if (!coupon) throw new NotFoundError('Cupom não encontrado');
    return coupon;
  }

  private async assertCodeNotDuplicate(code: string): Promise<void> {
    const exists = await prisma.coupon.findUnique({ where: { code } });
    if (exists) throw new ConflictError(`Cupom "${code}" já existe`);
  }
}

export const couponAdminService = new CouponAdminService();
