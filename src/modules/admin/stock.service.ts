import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '#config/prisma';

export const stockMovementFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  variantId: z.string().uuid().optional(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']).optional(),
});

export type StockMovementFilterInput = z.infer<typeof stockMovementFilterSchema>;

export class StockService {
  async getLowStockAlerts() {
    const variants = await this.fetchVariants();
    const lowStock = this.filterLowStock(variants);

    return { data: lowStock, total: lowStock.length };
  }

  async getMovements(filters: StockMovementFilterInput) {
    const { page, limit, variantId, type } = filters;
    const skip = (page - 1) * limit;
    const where = this.buildWhere(variantId, type);

    const [movements, total] = await prisma.$transaction([
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variant: {
            select: {
              id: true,
              name: true,
              sku: true,
              product: { select: { name: true, slug: true } },
            },
          },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return {
      data: movements,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Prisma não suporta comparação entre dois campos da mesma tabela
   * (stock <= stockMin). Buscamos os registros ativos e
   * filtramos em memória com TypeScript.
   */
  private filterLowStock(variants: Awaited<ReturnType<typeof this.fetchVariants>>) {
    return variants
      .filter((v) => v.stock <= v.stockMin)
      .map((v) => ({
        id: v.id,
        variantName: v.name,
        sku: v.sku,
        stock: v.stock,
        stockMin: v.stockMin,
        productId: v.product.id,
        productName: v.product.name,
        slug: v.product.slug,
      }));
  }

  private async fetchVariants() {
    return prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: { isActive: true, deletedAt: null },
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { stock: 'asc' },
    });
  }

  private buildWhere(
    variantId: string | undefined,
    type: string | undefined,
  ): Prisma.StockMovementWhereInput {
    return {
      ...(variantId && { variantId }),
      ...(type && { type: type as Prisma.EnumStockMovementTypeFilter['equals'] }),
    };
  }
}

export const stockService = new StockService();
