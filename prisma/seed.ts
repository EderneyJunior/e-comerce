import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { DiscountType, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedProducts() {
  console.log('Iniciando seed de produtos...');

  const eletronicos = await prisma.category.upsert({
    where: { slug: 'eletronicos' },
    update: {},
    create: { name: 'Eletrônicos', slug: 'eletronicos', sortOrder: 1 },
  });

  const smartphones = await prisma.category.upsert({
    where: { slug: 'smartphones' },
    update: {},
    create: { name: 'Smartphones', slug: 'smartphones', sortOrder: 1, parentId: eletronicos.id },
  });

  const existing = await prisma.product.findUnique({ where: { slug: 'smartphone-exemplo-x' } });

  if (!existing) {
    await prisma.product.create({
      data: {
        name: 'Smartphone Exemplo X',
        slug: 'smartphone-exemplo-x',
        description: 'Um smartphone de exemplo para testes.',
        basePrice: 2299.99,
        discountPrice: 2199.99,
        brand: 'ExampleBrand',
        sku: 'PHONE-X-001',
        isActive: true,
        isFeatured: true,
        categories: { create: [{ categoryId: smartphones.id }] },
        attributes: {
          create: [
            { name: 'Tela', value: '6.5"' },
            { name: 'RAM', value: '8GB' },
            { name: 'Armazenamento', value: '128GB' },
          ],
        },
        variants: {
          create: [
            {
              name: 'Preto / 128GB',
              sku: 'PHONE-X-BLK-128',
              stock: 50,
              stockMin: 10,
              attributes: { Cor: 'Preto', Armazenamento: '128GB' },
            },
            {
              name: 'Branco / 128GB',
              sku: 'PHONE-X-WHT-128',
              stock: 30,
              stockMin: 10,
              attributes: { Cor: 'Branco', Armazenamento: '128GB' },
            },
            {
              name: 'Preto / 256GB',
              sku: 'PHONE-X-BLK-256',
              stock: 20,
              stockMin: 5,
              price: 2899.99,
              attributes: { Cor: 'Preto', Armazenamento: '256GB' },
            },
          ],
        },
      },
    });

    console.log('Produto de exemplo  criado: Smartphone Exemplo X');
  }
}

async function seedCoupons() {
  const coupons = [
    {
      code: 'BEMVINDO',
      description: '10% de desconto na primeira compra',
      discountType: 'PERCENTAGE' as const,
      discountValue: 10,
      minOrderValue: 100,
      maxUsage: 1,
    },
    {
      code: 'FRETE0',
      description: 'Frete grátis em qualuer compra acima de R$ 50',
      discountType: 'FREE_SHIPPING' as const,
      discountValue: 0,
      minOrderValue: 50,
    },
    {
      code: 'DESC50',
      description: 'R$ 50 de desconto em compras acima de R$ 300',
      discountType: 'FIXED' as const,
      discountValue: 50,
      minOrderValue: 300,
    },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: coupon,
    });
  }

  console.log('Cupons criados: ', coupons.map((c) => c.code).join(', '));
}

async function main() {
  console.log('Iniciando seed...');

  const adminEmail = 'admin@ecommerce.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    await prisma.user.create({
      data: {
        name: 'Administrador',
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
      },
    });
    console.log('Admin criado: admin@ecommerce.com / Admin@123');
  } else {
    console.log('Admin já existe, pulando...');
  }
  await seedProducts();
  await seedCoupons();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
