"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

async function verifyAuth(allowedRoles: string[]) {
  const session = await auth();
  if (!session || !session.user || !allowedRoles.includes(session.user.role as string)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function createEmployee(data: {
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  salary: number;
  hireDate: string;
  email?: string;
  password?: string;
  role?: string;
}) {
  await verifyAuth(["ADMIN", "HR"]);
  
  if (data.salary <= 0) {
    throw new Error("Salary must be strictly positive (greater than 0).");
  }
  
  if (new Date(data.hireDate) > new Date()) {
    throw new Error("Hire date cannot be in the future.");
  }

  // If email is provided, verify it's unique
  if (data.email) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new Error("A user with this email already exists.");
    }
  }

  // We can wrap this in a transaction or just create user then employee
  await prisma.$transaction(async (tx) => {
    let userId = null;

    if (data.email && data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: (data.role as any) || "EMPLOYEE",
        }
      });
      userId = user.id;
    }

    await tx.employee.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        department: data.department,
        position: data.position,
        salary: data.salary,
        hireDate: new Date(data.hireDate),
        userId: userId
      }
    });
  });

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard");
}

export async function updateEmployee(id: string, data: {
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  salary: number;
  hireDate: string;
  email?: string;
  password?: string;
  role?: string;
}) {
  const session = await verifyAuth(["ADMIN", "HR"]);
  
  const existingEmployee = await prisma.employee.findUnique({
    where: { id },
    include: { user: true }
  });

  if (!existingEmployee) throw new Error("Employee not found");
  
  // Only ADMIN can update salary
  if (session.user?.role !== "ADMIN") {
    if (existingEmployee.salary !== data.salary) {
      throw new Error("Only Administrators can modify salaries.");
    }
    // Also restrict role changes if not admin
    if (data.role && data.role !== existingEmployee.user?.role) {
      throw new Error("Only Administrators can modify roles.");
    }
  } else {
    // If it is an admin, validate the salary
    if (data.salary <= 0) {
      throw new Error("Salary must be strictly positive (greater than 0).");
    }
  }

  if (new Date(data.hireDate) > new Date()) {
    throw new Error("Hire date cannot be in the future.");
  }

  await prisma.$transaction(async (tx) => {
    // Update employee info
    await tx.employee.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        department: data.department,
        position: data.position,
        salary: data.salary,
        hireDate: new Date(data.hireDate),
      }
    });

    // Update user info if user exists, else create user if new credentials provided
    if (existingEmployee.userId) {
      const userUpdateData: any = {};
      if (data.email) userUpdateData.email = data.email;
      if (data.password) userUpdateData.password = await bcrypt.hash(data.password, 10);
      if (data.role) userUpdateData.role = data.role as any;

      if (Object.keys(userUpdateData).length > 0) {
        // check email unique
        if (data.email && data.email !== existingEmployee.user?.email) {
           const emailCheck = await tx.user.findUnique({ where: { email: data.email }});
           if (emailCheck) throw new Error("Email already taken.");
        }
        await tx.user.update({
          where: { id: existingEmployee.userId },
          data: userUpdateData
        });
      }
    } else if (data.email && data.password) {
      // User doesn't exist but credentials are provided
      const emailCheck = await tx.user.findUnique({ where: { email: data.email }});
      if (emailCheck) throw new Error("Email already taken.");

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: (data.role as any) || "EMPLOYEE",
        }
      });
      await tx.employee.update({
        where: { id },
        data: { userId: user.id }
      });
    }
  });

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard");
}

export async function deleteEmployee(id: string) {
  await verifyAuth(["ADMIN", "HR"]);
  
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) return;

  await prisma.$transaction(async (tx) => {
    await tx.employee.delete({ where: { id } });
    if (emp.userId) {
      // Because we added onDelete: Cascade, deleting the User might be better
      // but here we are deleting the employee first. Let's delete the user.
      await tx.user.delete({ where: { id: emp.userId } });
    }
  });

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard");
}
