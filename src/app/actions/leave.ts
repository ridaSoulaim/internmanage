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

export async function requestLeave(data: {
  leaveType: "SICK" | "CASUAL" | "EXAM_STUDY" | "ANNUAL" | "UNPAID";
  startDate: string;
  endDate: string;
  reason: string;
}) {
  const session = await getAuthenticatedUser();

  const employee = await prisma.employee.findUnique({
    where: { userId: session.user.id },
  });

  if (!employee) {
    throw new Error("No employee record linked to this account.");
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date provided.");
  }

  if (start > end) {
    throw new Error("Start date must be before or equal to end date.");
  }

  // Calculate day difference (inclusive)
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (!data.reason || data.reason.trim().length === 0) {
    throw new Error("Please provide a reason for the leave request.");
  }

  const startDateOnly = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
  const endDateOnly = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()));

  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId: employee.id,
      leaveType: data.leaveType,
      startDate: startDateOnly,
      endDate: endDateOnly,
      days: diffDays,
      reason: data.reason.trim(),
      status: "PENDING",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard/attendance");
  return { success: true, leaveId: leave.id };
}

export async function reviewLeaveRequest(data: {
  id: string;
  status: "APPROVED" | "REJECTED";
  reviewNote?: string;
}) {
  const session = await getAuthenticatedUser();
  if (session.user.role !== "ADMIN" && session.user.role !== "HR") {
    throw new Error("Only Admin or HR can review leave requests.");
  }

  let reviewerName = session.user.role === "ADMIN" ? "Administrator" : "HR Manager";
  const reviewerEmployee = await prisma.employee.findUnique({
    where: { userId: session.user.id },
  });
  if (reviewerEmployee) {
    reviewerName = `${reviewerEmployee.firstName} ${reviewerEmployee.lastName} (${session.user.role})`;
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: data.id },
    data: {
      status: data.status,
      reviewNote: data.reviewNote || (data.status === "APPROVED" ? "Leave approved" : "Leave request declined"),
      reviewedBy: reviewerName,
      reviewedAt: new Date(),
    },
    include: {
      employee: true,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard/attendance");
  return { success: true, updated };
}

export async function cancelLeaveRequest(id: string) {
  const session = await getAuthenticatedUser();

  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true },
  });

  if (!leave) {
    throw new Error("Leave request not found.");
  }

  // Only the employee who created it or Admin/HR can cancel/delete
  const isOwner = leave.employee.userId === session.user.id;
  const isPrivileged = session.user.role === "ADMIN" || session.user.role === "HR";

  if (!isOwner && !isPrivileged) {
    throw new Error("Unauthorized to cancel this request.");
  }

  if (leave.status !== "PENDING" && !isPrivileged) {
    throw new Error("Cannot cancel a leave request that has already been reviewed.");
  }

  await prisma.leaveRequest.delete({
    where: { id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard/attendance");
  return { success: true };
}
