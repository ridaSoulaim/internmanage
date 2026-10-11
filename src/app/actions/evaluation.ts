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

// ----------------------------------------------------
// MILESTONE ACTIONS
// ----------------------------------------------------

export async function createMilestone(data: {
  employeeId: string;
  title: string;
  description?: string;
  targetWeek?: number;
  dueDate?: string;
}) {
  const session = await getAuthenticatedUser();
  if (session.user.role !== "ADMIN" && session.user.role !== "HR") {
    throw new Error("Only Administrators or HR managers can assign milestones.");
  }

  if (!data.title || data.title.trim().length === 0) {
    throw new Error("Milestone title is required.");
  }

  const dueDateParsed = data.dueDate ? new Date(data.dueDate) : null;

  const milestone = await prisma.milestone.create({
    data: {
      employeeId: data.employeeId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      targetWeek: data.targetWeek || null,
      dueDate: dueDateParsed,
      status: "PENDING",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reviews");
  return { success: true, milestone };
}

export async function updateMilestoneStatus(
  id: string,
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED",
  mentorFeedback?: string
) {
  const session = await getAuthenticatedUser();
  const isAdminOrHr = session.user.role === "ADMIN" || session.user.role === "HR";

  const existing = await prisma.milestone.findUnique({
    where: { id },
    include: { employee: true },
  });

  if (!existing) {
    throw new Error("Milestone not found.");
  }

  if (!isAdminOrHr) {
    const isOwner = existing.employee.userId === session.user.id;
    if (!isOwner) {
      throw new Error("Unauthorized to update this milestone.");
    }
  }

  const milestone = await prisma.milestone.update({
    where: { id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
      mentorFeedback: isAdminOrHr && mentorFeedback !== undefined ? mentorFeedback.trim() : undefined,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reviews");
  return { success: true, milestone };
}

export async function deleteMilestone(id: string) {
  const session = await getAuthenticatedUser();
  if (session.user.role !== "ADMIN" && session.user.role !== "HR") {
    throw new Error("Unauthorized to delete milestone.");
  }

  await prisma.milestone.delete({ where: { id } });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reviews");
  return { success: true };
}

// ----------------------------------------------------
// PERFORMANCE REVIEW & PPO ACTIONS
// ----------------------------------------------------

export async function createPerformanceReview(data: {
  employeeId: string;
  reviewCycle: "MID_TERM" | "FINAL" | "MONTHLY_CHECKIN";
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  initiativeScore: number;
  strengths: string;
  areasForGrowth?: string;
  ppoDecision: "UNDER_EVALUATION" | "RECOMMENDED_FOR_PPO" | "PPO_OFFERED" | "EXTEND_INTERNSHIP" | "NO_OFFER";
}) {
  const session = await getAuthenticatedUser();
  if (session.user.role !== "ADMIN" && session.user.role !== "HR") {
    throw new Error("Only HR or Administrators can submit official performance reviews.");
  }

  if (!data.strengths || data.strengths.trim().length === 0) {
    throw new Error("Please provide notes on intern strengths.");
  }

  let reviewerName = session.user.role === "ADMIN" ? "Administrator" : "HR Manager";
  const reviewerEmp = await prisma.employee.findUnique({
    where: { userId: session.user.id },
  });
  if (reviewerEmp) {
    reviewerName = `${reviewerEmp.firstName} ${reviewerEmp.lastName} (${session.user.role})`;
  }

  // Calculate average overall score
  const avg = (data.technicalScore + data.communicationScore + data.problemSolvingScore + data.initiativeScore) / 4;
  const overallScore = Math.round(avg * 10) / 10;

  const review = await prisma.performanceReview.create({
    data: {
      employeeId: data.employeeId,
      reviewerName,
      reviewCycle: data.reviewCycle,
      technicalScore: data.technicalScore,
      communicationScore: data.communicationScore,
      problemSolvingScore: data.problemSolvingScore,
      initiativeScore: data.initiativeScore,
      overallScore,
      strengths: data.strengths.trim(),
      areasForGrowth: data.areasForGrowth?.trim() || null,
      ppoDecision: data.ppoDecision,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reviews");
  return { success: true, review };
}

export async function updatePpoDecision(
  reviewId: string,
  ppoDecision: "UNDER_EVALUATION" | "RECOMMENDED_FOR_PPO" | "PPO_OFFERED" | "EXTEND_INTERNSHIP" | "NO_OFFER"
) {
  const session = await getAuthenticatedUser();
  if (session.user.role !== "ADMIN" && session.user.role !== "HR") {
    throw new Error("Only HR or Administrators can update PPO decisions.");
  }

  const review = await prisma.performanceReview.update({
    where: { id: reviewId },
    data: { ppoDecision },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reviews");
  return { success: true, review };
}

export async function deletePerformanceReview(id: string) {
  const session = await getAuthenticatedUser();
  if (session.user.role !== "ADMIN" && session.user.role !== "HR") {
    throw new Error("Unauthorized to delete performance review.");
  }

  await prisma.performanceReview.delete({ where: { id } });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reviews");
  return { success: true };
}
