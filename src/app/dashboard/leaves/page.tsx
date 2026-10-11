import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LeavesClient } from "./leaves-client";

export default async function LeavesPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/");
  }

  const userRole = session.user.role || "EMPLOYEE";
  const userId = session.user.id;

  // Find employee linked to session
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

  // Fetch leave requests (all for Admin/HR, user's own for regular Employee)
  let leaves: any[] = [];
  if (userRole === "ADMIN" || userRole === "HR") {
    leaves = await prisma.leaveRequest.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 100,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            userId: true,
            user: { select: { email: true } },
          },
        },
      },
    });
  } else if (currentEmployee) {
    leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: currentEmployee.id },
      orderBy: [{ createdAt: "desc" }],
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            userId: true,
            user: { select: { email: true } },
          },
        },
      },
    });
  }

  return (
    <LeavesClient
      userRole={userRole}
      currentUserId={userId || ""}
      currentEmployee={currentEmployee}
      leaves={leaves as any}
    />
  );
}
