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

export async function createTask(data: {
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  assigneeId?: string;
  tags?: string;
  deliverableUrl?: string;
}) {
  const session = await getAuthenticatedUser();

  if (!data.title || data.title.trim().length === 0) {
    throw new Error("Task title is required.");
  }

  const isAdminOrHr = session.user.role === "ADMIN" || session.user.role === "HR";
  let assigneeId = data.assigneeId || null;

  // If a regular employee creates a task and didn't specify an assignee, assign to themselves
  if (!isAdminOrHr && !assigneeId) {
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });
    if (employee) {
      assigneeId = employee.id;
    }
  }

  const parsedDueDate = data.dueDate ? new Date(data.dueDate) : null;

  const task = await prisma.task.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      priority: data.priority,
      status: "TODO",
      dueDate: parsedDueDate,
      assigneeId: assigneeId,
      tags: data.tags?.trim() || null,
      deliverableUrl: data.deliverableUrl?.trim() || null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  return { success: true, task };
}

export async function updateTaskStatus(
  taskId: string,
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE"
) {
  const session = await getAuthenticatedUser();
  const isAdminOrHr = session.user.role === "ADMIN" || session.user.role === "HR";

  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true },
  });

  if (!existingTask) {
    throw new Error("Task not found.");
  }

  if (!isAdminOrHr) {
    const isOwner = existingTask.assignee?.userId === session.user.id;
    if (!isOwner) {
      throw new Error("You can only update the status of tasks assigned to you.");
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  return { success: true, task };
}

export async function updateTask(
  taskId: string,
  data: {
    title: string;
    description?: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    status?: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
    dueDate?: string;
    assigneeId?: string;
    tags?: string;
    deliverableUrl?: string;
    reviewFeedback?: string;
  }
) {
  const session = await getAuthenticatedUser();
  const isAdminOrHr = session.user.role === "ADMIN" || session.user.role === "HR";

  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true },
  });

  if (!existingTask) {
    throw new Error("Task not found.");
  }

  if (!isAdminOrHr) {
    const isOwner = existingTask.assignee?.userId === session.user.id;
    if (!isOwner) {
      throw new Error("Unauthorized to edit this task.");
    }
  }

  const parsedDueDate = data.dueDate ? new Date(data.dueDate) : null;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: data.title.trim(),
      description: data.description !== undefined ? data.description.trim() : undefined,
      priority: data.priority,
      status: data.status,
      dueDate: parsedDueDate,
      assigneeId: isAdminOrHr ? (data.assigneeId || null) : existingTask.assigneeId,
      tags: data.tags !== undefined ? data.tags.trim() : undefined,
      deliverableUrl: data.deliverableUrl !== undefined ? data.deliverableUrl.trim() : undefined,
      reviewFeedback: isAdminOrHr && data.reviewFeedback !== undefined ? data.reviewFeedback.trim() : undefined,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  return { success: true, task };
}

export async function submitDeliverable(
  taskId: string,
  deliverableUrl: string,
  notes?: string
) {
  const session = await getAuthenticatedUser();

  if (!deliverableUrl || deliverableUrl.trim().length === 0) {
    throw new Error("Please provide a valid deliverable URL (e.g. GitHub PR, Figma link, doc).");
  }

  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true },
  });

  if (!existingTask) {
    throw new Error("Task not found.");
  }

  const isAdminOrHr = session.user.role === "ADMIN" || session.user.role === "HR";
  const isOwner = existingTask.assignee?.userId === session.user.id;

  if (!isAdminOrHr && !isOwner) {
    throw new Error("You can only submit deliverables for tasks assigned to you.");
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      deliverableUrl: deliverableUrl.trim(),
      status: "IN_REVIEW",
      reviewFeedback: notes ? `Intern note: ${notes}` : null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  return { success: true, task };
}

export async function reviewTask(
  taskId: string,
  approved: boolean,
  reviewFeedback?: string
) {
  const session = await getAuthenticatedUser();
  if (session.user.role !== "ADMIN" && session.user.role !== "HR") {
    throw new Error("Only Administrators or HR managers can review and approve tasks.");
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: approved ? "DONE" : "IN_PROGRESS",
      reviewFeedback: reviewFeedback || (approved ? "Approved by mentor" : "Changes requested"),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  return { success: true, task };
}

export async function deleteTask(taskId: string) {
  const session = await getAuthenticatedUser();
  if (session.user.role !== "ADMIN" && session.user.role !== "HR") {
    throw new Error("Only Administrators or HR managers can delete tasks.");
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
  return { success: true };
}
