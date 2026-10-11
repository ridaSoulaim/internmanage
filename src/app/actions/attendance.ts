"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

async function getAuthenticatedUser() {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("Unauthorized");
  }
  return session as {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      role?: string;
    };
  };
}

export async function clockIn(workNotes?: string) {
  const session = await getAuthenticatedUser();

  const employee = await prisma.employee.findUnique({
    where: { userId: session.user.id },
  });

  if (!employee) {
    throw new Error("No employee record linked to this user account.");
  }

  // Normalize today's date to midnight UTC to match @db.Date
  const today = new Date();
  const dateOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  const existing = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: dateOnly,
      },
    },
  });

  if (existing && existing.checkIn) {
    throw new Error("You have already clocked in for today.");
  }

  const now = new Date();
  // Late if clocking in after 9:30 AM local time
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const isLate = currentHour > 9 || (currentHour === 9 && currentMinute > 30);

  if (existing) {
    await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkIn: now,
        status: isLate ? "LATE" : "PRESENT",
        workNotes: workNotes || existing.workNotes,
      },
    });
  } else {
    await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: dateOnly,
        checkIn: now,
        status: isLate ? "LATE" : "PRESENT",
        workNotes: workNotes || null,
      },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");
  return { success: true, message: `Clocked in successfully at ${now.toLocaleTimeString()}` };
}

export async function clockOut(workNotes?: string) {
  const session = await getAuthenticatedUser();

  const employee = await prisma.employee.findUnique({
    where: { userId: session.user.id },
  });

  if (!employee) {
    throw new Error("No employee record linked to this account.");
  }

  const today = new Date();
  const dateOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  const existing = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: dateOnly,
      },
    },
  });

  if (!existing || !existing.checkIn) {
    throw new Error("You must clock in before clocking out.");
  }

  if (existing.checkOut) {
    throw new Error("You have already clocked out for today.");
  }

  const now = new Date();

  await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut: now,
      workNotes: workNotes || existing.workNotes,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");
  return { success: true, message: `Clocked out successfully at ${now.toLocaleTimeString()}` };
}

export async function adminRecordAttendance(data: {
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LATE" | "REMOTE";
  workNotes?: string;
}) {
  const session = await getAuthenticatedUser();
  if (session.user.role !== "ADMIN" && session.user.role !== "HR") {
    throw new Error("Only Admin or HR can record manual attendance.");
  }

  const parsedDate = new Date(data.date);
  const dateOnly = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));

  const checkInDate = data.checkIn ? new Date(`${data.date}T${data.checkIn}`) : null;
  const checkOutDate = data.checkOut ? new Date(`${data.date}T${data.checkOut}`) : null;

  await prisma.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId: data.employeeId,
        date: dateOnly,
      },
    },
    update: {
      checkIn: checkInDate,
      checkOut: checkOutDate,
      status: data.status,
      workNotes: data.workNotes || null,
    },
    create: {
      employeeId: data.employeeId,
      date: dateOnly,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      status: data.status,
      workNotes: data.workNotes || null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");
  return { success: true };
}

export async function deleteAttendanceRecord(id: string) {
  const session = await getAuthenticatedUser();
  if (session.user.role !== "ADMIN" && session.user.role !== "HR") {
    throw new Error("Unauthorized");
  }

  await prisma.attendance.delete({
    where: { id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");
  return { success: true };
}
