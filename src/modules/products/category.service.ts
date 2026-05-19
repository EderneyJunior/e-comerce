import { prisma } from '#config/prisma';
import { NotFoundError, ConflictError } from '#shared/errors/appError';
import { uniqueCategorySlug } from '#shared/utils/slug';
import type { CreateCategoryInput, UpdateCategoryInput } from './product.schema';

export class CategoryService {
  async findAll() {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    return categories;
  }

  async findBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug, isActive: true },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        parent: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!category) throw new NotFoundError('Categoria não encontrada');
    return category;
  }

  async create(data: CreateCategoryInput) {
    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) throw new NotFoundError('Categoria pai não encontrada');
    }

    const slug = await uniqueCategorySlug(data.name);

    return prisma.category.create({
      data: { ...data, slug },
    });
  }

  async update(id: string, data: UpdateCategoryInput) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundError('Categoria não encontrada');

    if (data.parentId === id) throw new ConflictError('Uma categoria não pode ser pai de si mesma');

    const slug = data.name ? await uniqueCategorySlug(data.name, id) : category.slug;

    return prisma.category.update({
      where: { id },
      data: { ...data, slug },
    });
  }

  async delete(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });

    if (!category) throw new NotFoundError('Categoria não encontrada');

    if (category.children.length > 0)
      throw new ConflictError('Não é possível excluir uma categoria que possui subcategorias');

    await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const categoryService = new CategoryService();
