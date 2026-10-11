import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);
  
  const user = await prisma.user.upsert({
    where: { email: "hr@example.com" },
    update: {},
    create: {
      email: "hr@example.com",
      password: hashedPassword,
      role: "HR",
    },
  });

  await prisma.employee.create({
    data: {
      firstName: "Sarah",
      lastName: "Connor",
      department: "Human Resources",
      position: "HR Manager",
      salary: 85000,
      hireDate: new Date(),
      userId: user.id
    }
  });

  console.log("Successfully added HR User!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
