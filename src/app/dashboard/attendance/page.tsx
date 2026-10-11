import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AttendanceClient } from "./attendance-client";

export default async function AttendancePage() {
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

  // Get today's attendance for current employee
  let todayAttendance = null;
  if (currentEmployee) {
    const today = new Date();
    const dateOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    todayAttendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: currentEmployee.id,
          date: dateOnly,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            user: { select: { email: true } },
          },
        },
      },
    });
  }

  // Fetch attendance records (If Admin/HR, get all; if Employee, get theirs)
  let attendances: any[] = [];
  if (userRole === "ADMIN" || userRole === "HR") {
    attendances = await prisma.attendance.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            user: { select: { email: true } },
          },
        },
      },
    });
  } else if (currentEmployee) {
    attendances = await prisma.attendance.findMany({
      where: { employeeId: currentEmployee.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            user: { select: { email: true } },
          },
        },
      },
    });
  }

  // Fetch all employees for dropdowns
  const allEmployees = await prisma.employee.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
    },
    orderBy: { firstName: "asc" },
  });

  return (
    <AttendanceClient
      userRole={userRole}
      currentEmployee={currentEmployee}
      todayAttendance={todayAttendance as any}
      attendances={attendances as any}
      allEmployees={allEmployees}
    />
  );
}
