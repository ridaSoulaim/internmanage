import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PayrollClient, EmployeePayrollItem } from "./payroll-client";
import { AttendanceStatus } from "@prisma/client";

interface EmployeeWithAttendance {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  salary: number;
  hireDate: Date;
  userId: string | null;
  attendances: {
    checkIn: Date | null;
    checkOut: Date | null;
    status: AttendanceStatus;
    date: Date;
  }[];
}

export default async function PayrollPage() {
  const session = await auth();
  if (!session || !session.user) redirect("/");

  const userRole = session.user.role || "EMPLOYEE";
  const userId = session.user.id;
  const isPrivileged = userRole === "ADMIN" || userRole === "HR";

  // Fetch employees with their attendance records
  let rawEmployees: EmployeeWithAttendance[] = [];

  if (isPrivileged) {
    rawEmployees = await prisma.employee.findMany({
      orderBy: { salary: "desc" },
      include: {
        attendances: {
          select: {
            checkIn: true,
            checkOut: true,
            status: true,
            date: true,
          },
        },
      },
    });
  } else if (userId) {
    const singleEmp = await prisma.employee.findUnique({
      where: { userId },
      include: {
        attendances: {
          select: {
            checkIn: true,
            checkOut: true,
            status: true,
            date: true,
          },
        },
      },
    });

    if (singleEmp) {
      rawEmployees = [singleEmp];
    }
  }

  // Transform and calculate hourly pay and logged hours
  const employees: EmployeePayrollItem[] = rawEmployees.map((emp) => {
    const annualSalary = emp.salary || 0;
    const monthlySalary = annualSalary > 0 ? annualSalary / 12 : 0;
    // Standard working year: 40 hrs/wk * 52 wks = 2,080 hours
    const hourlyRate = annualSalary > 0 ? Math.round((annualSalary / 2080) * 100) / 100 : 0;

    let totalHours = 0;
    let overtime = 0;

    for (const att of emp.attendances || []) {
      if (att.checkIn && att.checkOut) {
        const diffMs = new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime();
        const hrs = Math.max(0, diffMs / (1000 * 60 * 60));
        totalHours += hrs;
        if (hrs > 8) {
          overtime += hrs - 8;
        }
      } else if (att.status === "PRESENT" || att.status === "LATE" || att.status === "REMOTE") {
        totalHours += 8;
      } else if (att.status === "HALF_DAY") {
        totalHours += 4;
      }
    }

    return {
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      department: emp.department,
      position: emp.position,
      hireDate: emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : "",
      annualSalary,
      monthlySalary,
      hourlyRate,
      loggedHours: Math.round(totalHours * 10) / 10,
      overtimeHours: Math.round(overtime * 10) / 10,
      attendanceCount: emp.attendances?.length || 0,
      userId: emp.userId,
    };
  });

  return (
    <PayrollClient
      employees={employees}
      userRole={userRole}
      currentUserId={userId || ""}
      isSingleEmployeeView={!isPrivileged}
    />
  );
}
