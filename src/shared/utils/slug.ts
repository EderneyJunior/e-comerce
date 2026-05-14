import slugify from 'slugify';
import { prisma } from '#config/prisma';

export function createSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    locale: 'pt',
    trim: true,
  });
}

export async function uniqueProductSlug(name: string, excludeId?: string): Promise<string> {
  const base = createSlug(name);
  let slug = base;
  let count = 1;

  while (true) {
    const existing = await prisma.product.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (!existing) return slug;
    slug = `${base}-${count++}`;
  }
}

export async function uniqueCategorySlug(name: string, excludeId?: string): Promise<string> {
  const base = createSlug(name);
  let slug = base;
  let count = 1;

  while (true) {
    const existing = await prisma.category.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (!existing) return slug;
    slug = `${base}-${count++}`;
  }
}
