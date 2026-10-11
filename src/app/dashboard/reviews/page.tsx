import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ReviewsClient } from "./reviews-client";

export default async function ReviewsPage() {
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

  // Fetch milestones
  let milestones: any[] = [];
  if (userRole === "ADMIN" || userRole === "HR") {
    milestones = await prisma.milestone.findMany({
      orderBy: [{ targetWeek: "asc" }, { createdAt: "desc" }],
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        },
      },
    });
  } else if (currentEmployee) {
    milestones = await prisma.milestone.findMany({
      where: { employeeId: currentEmployee.id },
      orderBy: [{ targetWeek: "asc" }, { createdAt: "desc" }],
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        },
      },
    });
  }

  // Fetch reviews
  let reviews: any[] = [];
  if (userRole === "ADMIN" || userRole === "HR") {
    reviews = await prisma.performanceReview.findMany({
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
          },
        },
      },
    });
  } else if (currentEmployee) {
    reviews = await prisma.performanceReview.findMany({
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
          },
        },
      },
    });
  }

  // Fetch employees for dropdowns
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
    <ReviewsClient
      userRole={userRole}
      currentUserId={userId || ""}
      currentEmployee={currentEmployee}
      milestones={milestones}
      reviews={reviews}
      employees={employees}
    />
  );
}
