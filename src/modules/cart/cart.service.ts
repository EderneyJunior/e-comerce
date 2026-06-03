import { prisma } from '#config/prisma';
import { env } from '#config/env';
import { validateAndCalculateCoupon } from './coupon.service';
import { calculateTotals } from './shipping.service';
import { NotFoundError, AppError } from '#shared/errors/appError';
import { addDays } from 'date-fns';

const cartInclude = {
  variant: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          basePrice: true,
          discountPrice: true,
          images: {
            where: { isCover: true },
            take: 1,
            select: { url: true, altText: true },
          },
        },
      },
    },
  },
} as const;

export class CartService {
  async getCart(userId?: string, sessionId?: string) {
    const cart = await this.findCart(userId, sessionId);

    if (!cart) {
      return this.emptyCartResponse(sessionId);
    }

    return this.formatCartResponse(cart);
  }

  async addItem(variantId: string, quantity: number, userId?: string, sessionId?: string) {
    if (!userId && !sessionId) throw new AppError('Sessão ou usuario não identificado', 400);

    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, isActive: true, product: { isActive: true, deletedAt: null } },
    });
    if (!variant) throw new NotFoundError('Produto ou Variante não encontrado');

    if (variant.stock < quantity)
      throw new AppError(`Estoque insuficiente. Disponivel: ${variant.stock} unidade(s)`, 400);

    const cart = await this.findOrCreateCart(userId, sessionId);
    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart!.id, variantId } },
    });

    if (existingItem) {
      const newQty = Math.min(existingItem.quantity + quantity, 99);

      if (newQty > variant.stock)
        throw new AppError(`Estoque insuficiente. Disponivel: ${variant.stock} unidade(s)`, 400);

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
      return this.getCart(userId, sessionId);
    }

    await prisma.cartItem.create({
      data: {
        cartId: cart!.id,
        variantId,
        quantity,
      },
    });
    return this.getCart(userId, sessionId);
  }

  async updateItem(itemId: string, quantity: number, userId?: string, sessionId?: string) {
    if (quantity < 0) throw new AppError('Quantidade inválida', 400);

    const cart = await this.findCart(userId, sessionId);
    if (!cart) throw new NotFoundError('Carrinho não encontrado');

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { variant: true },
    });
    if (!item) throw new NotFoundError('Item do carrinho não encontrado');

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      return this.getCart(userId, sessionId);
    }

    if (quantity > item.variant.stock) {
      throw new AppError(`Estoque insuficiente. Disponivel: ${item.variant.stock} unidade(s)`, 400);
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
    return this.getCart(userId, sessionId);
  }

  async removeItem(itemId: string, userId?: string, sessionId?: string) {
    const cart = await this.findCart(userId, sessionId);
    if (!cart) throw new NotFoundError('Carrinho não encontrado');

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundError('Item do carrinho não encontrado');

    await prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(userId, sessionId);
  }

  async clearCart(userId?: string, sessionId?: string) {
    const cart = await this.findCart(userId, sessionId);

    if (cart) {
      await prisma.$transaction([
        prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
        prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } }),
      ]);
    }
  }

  async mergeCart(userId: string, sessionId: string) {
    const anonymousCart = await this.findCart(undefined, sessionId);

    if (!anonymousCart || anonymousCart.items.length === 0) {
      if (anonymousCart) {
        await prisma.cart.delete({ where: { id: anonymousCart.id } });
      }
      return this.getCart(userId, sessionId);
    }

    const userCart = await this.findOrCreateCart(userId);

    for (const anonItem of anonymousCart.items) {
      try {
        const existingItem = await prisma.cartItem.findUnique({
          where: { cartId_variantId: { cartId: userCart!.id, variantId: anonItem.variantId } },
        });

        if (existingItem) {
          const newQty = Math.min(existingItem.quantity + anonItem.quantity, 99);
          await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: newQty },
          });
        }

        if (!existingItem) {
          if (anonItem.variant.stock >= anonItem.quantity) {
            await prisma.cartItem.create({
              data: {
                cartId: userCart!.id,
                variantId: anonItem.variantId,
                quantity: anonItem.quantity,
              },
            });
          }
        }
      } catch {}
    }

    await prisma.cart.delete({ where: { id: anonymousCart.id } });
    return this.getCart(userId, sessionId);
  }

  async applyCoupon(code: string, userId?: string) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { variant: true } } },
    });
    if (!cart || cart.items.length === 0)
      throw new NotFoundError('Carrinho não encontrado ou vazio');

    const subTotal = this.calculateSubtotal(cart.items);
    const { coupon } = await validateAndCalculateCoupon(code, subTotal, userId);

    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: coupon.id },
    });
    return this.getCart(userId);
  }

  async removeCoupon(userId?: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });

    if (cart) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { couponId: null },
      });
    }

    return this.getCart(userId);
  }

  async cleanExpiredCarts(): Promise<number> {
    const result = await prisma.cart.deleteMany({
      where: {
        userId: null,
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
  private async findOrCreateCart(userId?: string, sessionId?: string) {
    if (userId) {
      return prisma.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    }

    if (sessionId) {
      const expiresAt = addDays(new Date(), env.CART_ANONYMOUS_TTL_DAYS);
      return prisma.cart.upsert({
        where: { sessionId },
        create: { sessionId, expiresAt },
        update: { expiresAt },
      });
    }
  }

  private async findCart(userId?: string, sessionId?: string) {
    if (userId) {
      return prisma.cart.findUnique({
        where: { userId },
        include: { items: { include: cartInclude }, counpon: true },
      });
    }

    if (sessionId) {
      return prisma.cart.findUnique({
        where: { sessionId },
        include: { items: { include: cartInclude }, counpon: true },
      });
    }

    return null;
  }

  private calculateSubtotal(items: any[]): number {
    return items.reduce((acc, item) => {
      const price = Number(item.variant.price ?? item.variant.product?.basePrice ?? 0);
      return acc + price * item.quantity;
    }, 0);
  }

  private emptyCartResponse(sessionId?: string) {
    return {
      sessionId: sessionId ?? null,
      items: [],
      coupon: null,
      totals: { subtotal: 0, discount: 0, shipping: 0, total: 0, freeShipping: false },
      itemCount: 0,
    };
  }

  private formatCartResponse(cart: any) {
    const items = cart.items
      .filter((item: any) => item.variant?.product?.isActive)
      .map((item: any) => {
        const unitPrice = Number(
          item.variant.price ??
            item.variant.product?.discountPrice ??
            item.variant.product?.basePrice ??
            0,
        );
        return {
          id: item.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice,
          subtotal: Number.parseFloat((unitPrice * item.quantity).toFixed(2)),
          variant: {
            id: item.variant.id,
            name: item.variant.name,
            sku: item.variant.sku,
            stock: item.variant.stock,
            attributes: item.variant.attributes,
            product: item.variant.product,
          },
        };
      });

    const subtotal = items.reduce((acc: number, i: any) => acc + i.subtotal, 0);

    let discountAmount = 0;
    let couponInfo = null;

    if (cart.coupon) {
      const c = cart.coupon;
      if (c.discountType === 'PERCENTAGE') {
        discountAmount = (subtotal * Number(c.discountValue)) / 100;
      } else if (c.discountType === 'FIXED') {
        discountAmount = Math.min(Number(c.discountValue), subtotal);
      }
      couponInfo = {
        id: c.id,
        code: c.code,
        discountType: c.discountType,
        discountValue: Number(c.discountValue),
        discountAmount: Number.parseFloat(discountAmount.toFixed(2)),
      };
    }

    return {
      id: cart.id,
      items,
      coupon: couponInfo,
      totals: calculateTotals(subtotal, discountAmount, 0),
      itemCount: items.reduce((acc: number, i: any) => acc + i.quantity, 0),
    };
  }
}

export const cartService = new CartService();
