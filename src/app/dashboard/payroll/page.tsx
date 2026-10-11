import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function PayrollPage() {
  const session = await auth();
  if (!session) redirect("/");

  // Only Admin or HR should ideally see this, but we'll show it for Admin primarily.
  // Actually, we'll allow HR and Admin to view payroll, but maybe only Admin can see actual salaries.
  const userRole = session.user?.role as string;
  const isAuthorized = userRole === "ADMIN" || userRole === "HR";

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Access Denied</h2>
        <p className="text-zinc-500 mt-2">You do not have permission to view payroll information.</p>
      </div>
    );
  }

  const employees = await prisma.employee.findMany({
    orderBy: { salary: "desc" },
  });

  const totalPayroll = employees.reduce((sum, emp) => sum + emp.salary, 0);

  const formatCurrency = (amount: number) => {
    if (userRole !== "ADMIN") return "****";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Payroll Management</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Review and process monthly employee compensation.</p>
        </div>
        
        {userRole === "ADMIN" && (
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Download size={16} /> Export CSV
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Total Monthly Payroll</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center shadow-sm border border-indigo-100 dark:border-indigo-500/20">
              <DollarSign size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">{formatCurrency(totalPayroll / 12)}</div>
            <p className="text-xs font-medium text-zinc-500 mt-2">
              Estimated per month
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Total Annual Payroll</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center shadow-sm border border-emerald-100 dark:border-emerald-500/20">
              <DollarSign size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">{formatCurrency(totalPayroll)}</div>
            <p className="text-xs font-medium text-zinc-500 mt-2">
              Based on {employees.length} employees
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-blue-900/20 dark:shadow-none dark:bg-zinc-900 bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 text-white rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
            <Calendar size={120} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-indigo-100">Next Processing Date</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center border border-white/20">
              <Calendar size={20} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-black tracking-tight">Oct 15, 2026</div>
            <p className="text-xs font-medium text-indigo-100 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Status: Pending Review
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl overflow-hidden">
        <header className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50">
          <CardTitle className="text-lg">Payroll Distribution</CardTitle>
          <CardDescription>Detailed breakdown of employee salaries.</CardDescription>
        </header>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-950/50">
              <TableRow className="border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                <TableHead>Employee Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="text-right">Annual Salary</TableHead>
                <TableHead className="text-right">Monthly Net (Est.)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-zinc-500">No data available.</TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id} className="border-zinc-200 dark:border-zinc-800">
                    <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">{emp.firstName} {emp.lastName}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell className="text-zinc-500">{emp.position}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(emp.salary)}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatCurrency(emp.salary / 12)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
