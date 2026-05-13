import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
