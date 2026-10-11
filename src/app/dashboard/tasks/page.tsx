import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { KanbanClient } from "./kanban-client";

export default async function TasksPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/");
  }

  const userRole = session.user.role || "EMPLOYEE";
  const userId = session.user.id;

  // Find linked employee
  let currentEmployee = null;
  if (userId) {
    currentEmployee = await prisma.employee.findUnique({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
      },
    });
  }

  // Fetch tasks
  const tasks = await prisma.task.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          position: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  // Fetch employees for assignee choices
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      position: true,
    },
    orderBy: { firstName: "asc" },
  });

  return (
    <KanbanClient
      userRole={userRole}
      currentUserId={userId || ""}
      currentEmployee={currentEmployee}
      initialTasks={tasks as any}
      employees={employees}
    />
  );
}
