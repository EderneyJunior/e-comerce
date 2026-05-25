import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(500).optional(),
  parentId: z.uuid().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const UpdateCategorySchema = createCategorySchema.partial();

const createProductBaseSchema = z.object({
  name: z.string().min(3, 'O nome deve conter pelo menos 3 caracteres').max(200).trim(),
  description: z.string().max(5000).optional(),
  basePrice: z.coerce
    .number({ error: 'O preço é obrigatório' })
    .positive('O preço deve ser um número positivo')
    .multipleOf(0.01),
  discountPrice: z.coerce.number().positive().multipleOf(0.01).optional().nullable(),
  sku: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  categoryIds: z.array(z.uuid()).min(1, 'Selecione pelo menos uma categoria'),
  isFeatured: z.boolean().default(false),
  attributes: z
    .array(
      z.object({
        name: z.string().min(1).max(100).trim(),
        value: z.string().min(1).max(200).trim(),
      }),
    )
    .optional()
    .default([]),
});

export const createProductSchema = createProductBaseSchema.refine(
  (data) => !data.discountPrice || data.discountPrice < data.basePrice,
  {
    message: 'Preço com desconto deve ser menor que o preço base',
    path: ['discountPrice'],
  },
);

export const updateProductSchema = createProductBaseSchema.partial();

export const createVariantSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  sku: z.string().min(1).max(100),
  stock: z.coerce.number().int().min(0).default(0),
  price: z.coerce.number().positive().multipleOf(0.01).optional().nullable(),
  stockMin: z.coerce.number().int().min(0).default(5),
  weight: z.coerce.number().positive().optional(),
  isActive: z.boolean().default(true),
  attributes: z
    .record(z.string().min(1).max(100), z.string().min(1).max(200))
    .optional()
    .default({}),
});

export const updateVariantSchema = createVariantSchema.partial();

export const adjustStockSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.coerce.number().int().positive('A quantidate deve ser positiva'),
  reason: z.string().max(200).optional(),
});

export const productFilterSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(200).optional(),
    categorySlug: z.string().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    brand: z.string().optional(),
    inStock: z.coerce.boolean().optional(),
    isFeatured: z.coerce.boolean().optional(),
    sortBy: z.enum(['createdAt', 'name', 'basePrice', 'avgRating']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine((data) => !data.minPrice || !data.maxPrice || data.minPrice <= data.maxPrice, {
    message: 'O preço mínimo deve ser menor ou igual ao preço máximo',
    path: ['minPrice'],
  });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
