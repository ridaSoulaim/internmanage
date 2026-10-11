"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

export async function updateAccount(email: string, newPassword?: string) {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const updateData: any = {};
  
  if (email && email !== session.user.email) {
    // Check if new email is taken
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error("Email is already in use by another account.");
    }
    updateData.email = email;
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }
    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData
    });
  }
  
  return { success: true };
}
