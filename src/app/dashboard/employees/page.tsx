import { prisma } from "@/lib/prisma";
import EmployeeClient from "./employee-client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function EmployeesPage() {
  const session = await auth();
  if (!session) redirect("/");

  const userRole = session.user?.role as string;

  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true }
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Employees</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your team members and their information.</p>
      </div>
      
      <EmployeeClient initialEmployees={employees} userRole={userRole} />
    </div>
  );
}
