import { prisma } from '#config/prisma';
import { AppError, NotFoundError } from '#shared/errors/appError';

export interface CouponValidationResult {
  coupon: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    description: string | null;
  };
  discountAmount: number;
}

export async function validateAndCalculateCoupon(
  code: string,
  subTotal: number,
  userId?: string,
): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase().trim() },
  });

  if (!coupon?.isActive) {
    throw new NotFoundError('Cupom não encontrado ou inativo');
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new AppError('Este cupom expirou', 400);
  }

  if (coupon.maxUsage !== null && coupon.usageCount >= coupon.maxUsage) {
    throw new AppError('Este cupom atingiu o limite maximo para uso', 400);
  }

  const minOrder = coupon.minOrderValue ? Number(coupon.minOrderValue) : null;
  if (minOrder !== null && subTotal < minOrder) {
    throw new AppError(`Valor minimo para este cupon: ${minOrder.toFixed(2)}`, 400);
  }

  if (userId && coupon.maxUsage !== null) {
    const userUsageCount = await prisma.orderCoupon.count({
      where: {
        couponId: coupon.id,
        order: { userId },
      },
    });

    if (userUsageCount >= coupon.maxUsagePerUser!) {
      throw new AppError('Voçê já usou este cupom o numero maximo de vezes', 400);
    }
  }

  let discountAmount = 0;

  if (coupon.discountType === 'PERCENTAGE') {
    discountAmount = (subTotal * Number(coupon.discountValue)) / 100;
  } else if (coupon.discountType === 'FIXED') {
    discountAmount = Math.min(Number(coupon.discountValue), subTotal);
  }

  return {
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      description: coupon.description,
    },
    discountAmount: Number.parseFloat(discountAmount.toFixed(2)),
  };
}
