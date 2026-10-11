import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'ADMIN',
      employee: {
        create: {
          firstName: 'Admin',
          lastName: 'User',
          department: 'Management',
          position: 'Administrator',
          salary: 100000,
          hireDate: new Date(),
        }
      }
    },
  });

  console.log('Seed completed. Admin user created/verified:');
  console.log(`Email: ${admin.email}`);
  console.log(`Password: password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
