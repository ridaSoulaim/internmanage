import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  Briefcase,
  Clock,
  CalendarDays,
  ArrowRight,
  CheckCircle2,
  KanbanSquare,
  Sparkles
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await auth();
  if (!session || !session.user) redirect("/");

  const userRole = session.user?.role;
  const isEmployee = userRole === "EMPLOYEE";

  // Today's date normalized for @db.Date
  const today = new Date();
  const dateOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  // Fetch real data from PostgreSQL via Prisma
  let employeeCount = 0;
  let totalPayroll = 0;
  let recentHires: any[] = [];
  let myEmployeeRecord: any = null;
  let myColleagues: any[] = [];
  let myTodayAttendance: any = null;
  let myPendingLeaves: any[] = [];
  let myActiveTasks: any[] = [];
  let pendingLeaves: any[] = [];
  let reviewQueueTasks: any[] = [];
  let totalTasks = 0;
  let doneTasks = 0;
  let todayPresentCount = 0;

  try {
    if (isEmployee) {
      // Fetch the specific employee
      myEmployeeRecord = await prisma.employee.findUnique({
        where: { userId: session.user.id },
      });

      if (myEmployeeRecord) {
        // Fetch today's attendance
        myTodayAttendance = await prisma.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: myEmployeeRecord.id,
              date: dateOnly,
            },
          },
        });

        // Fetch employee's leaves
        myPendingLeaves = await prisma.leaveRequest.findMany({
          where: { employeeId: myEmployeeRecord.id },
          orderBy: { createdAt: "desc" },
          take: 3,
        });

        // Fetch active tasks assigned to this intern
        myActiveTasks = await prisma.task.findMany({
          where: {
            assigneeId: myEmployeeRecord.id,
            status: { in: ["TODO", "IN_PROGRESS", "IN_REVIEW"] },
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          take: 3,
        });

        // Fetch colleagues in the same department
        myColleagues = await prisma.employee.findMany({
          where: {
            department: myEmployeeRecord.department,
            id: { not: myEmployeeRecord.id },
          },
          take: 5,
        });
      }
    } else {
      // Admin / HR Data
      employeeCount = await prisma.employee.count();
      const result = await prisma.employee.aggregate({
        _sum: { salary: true },
      });
      totalPayroll = result._sum.salary || 0;

      recentHires = await prisma.employee.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      // Today's attendance count
      todayPresentCount = await prisma.attendance.count({
        where: {
          date: dateOnly,
          status: { in: ["PRESENT", "LATE", "REMOTE"] },
        },
      });

      // Pending leave requests
      pendingLeaves = await prisma.leaveRequest.findMany({
        where: { status: "PENDING" },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              department: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      // Review queue tasks
      reviewQueueTasks = await prisma.task.findMany({
        where: { status: "IN_REVIEW" },
        include: {
          assignee: {
            select: {
              firstName: true,
              lastName: true,
              department: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
      });

      totalTasks = await prisma.task.count();
      doneTasks = await prisma.task.count({ where: { status: "DONE" } });
    }
  } catch (error) {
    console.error("Database connection failed:", error);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // --------------------------------------------------------
  // EMPLOYEE VIEW
  // --------------------------------------------------------
  if (isEmployee) {
    const isClockedIn = Boolean(myTodayAttendance?.checkIn);
    const isClockedOut = Boolean(myTodayAttendance?.checkOut);

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welcome back, {myEmployeeRecord?.firstName || "Intern"}!
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Here is your daily workspace, active tasks, and punch status.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/tasks"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors"
            >
              <KanbanSquare size={16} />
              Open Task Board
            </Link>
            <Link
              href="/dashboard/attendance"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
            >
              <Clock size={16} />
              Punch Clock
            </Link>
          </div>
        </div>

        {/* Highlight Card: Today's Shift & Attendance Status */}
        <Card className="border-0 shadow-lg shadow-zinc-200/50 dark:shadow-none dark:bg-zinc-900/90 rounded-2xl overflow-hidden relative border border-zinc-200/70 dark:border-zinc-800">
          <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-md ${
                  !isClockedIn
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                    : !isClockedOut
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 animate-pulse"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                }`}
              >
                <Clock size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {!isClockedIn
                      ? "You haven't clocked in yet today"
                      : !isClockedOut
                      ? "Clocked In & Currently Active"
                      : "Shift Completed for Today"}
                  </h3>
                  <Badge
                    variant={!isClockedIn ? "warning" : !isClockedOut ? "success" : "info"}
                    className="text-xs"
                  >
                    {!isClockedIn ? "Pending Punch" : !isClockedOut ? "In Progress" : "Completed"}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {myTodayAttendance?.checkIn
                    ? `Clocked in at ${new Date(myTodayAttendance.checkIn).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "Make sure to record your arrival to accurately log your working hours."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/attendance"
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                Punch In / Out <ArrowRight size={14} />
              </Link>
              <Link
                href="/dashboard/leaves"
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors"
              >
                Request Leave
              </Link>
            </div>
          </div>
        </Card>

        {/* 4 Stat Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Department</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center">
                <Briefcase size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 truncate">
                {myEmployeeRecord?.department || "N/A"}
              </div>
              <p className="text-xs text-zinc-500 mt-2">Your designated team</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Monthly Stipend</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center">
                <DollarSign size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
                {formatCurrency((myEmployeeRecord?.salary || 0) / 12)}
              </div>
              <p className="text-xs text-zinc-500 mt-2">Scheduled direct deposit</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Active Tasks</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 flex items-center justify-center">
                <KanbanSquare size={20} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
                {myActiveTasks.length}
              </div>
              <p className="text-xs text-zinc-500 mt-2">Deliverables in flight</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-blue-900/20 dark:shadow-none dark:bg-zinc-900 bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 text-white rounded-2xl overflow-hidden relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-sm font-semibold text-indigo-100">Leave Balance</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-white/10 text-white flex items-center justify-center">
                <CalendarDays size={20} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-black tracking-tight">18 Days</div>
              <p className="text-xs text-indigo-100 mt-2">Casual, Sick & Exam leaves remaining</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Grid: Tasks + Leaves + Team */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Active Tasks Widget */}
          <Card className="border-0 shadow-md shadow-zinc-200/50 dark:shadow-none dark:bg-zinc-900 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <KanbanSquare size={18} className="text-blue-600 dark:text-blue-400" />
                  Your Active Tasks
                </CardTitle>
                <CardDescription>Deliverables assigned to you</CardDescription>
              </div>
              <Link href="/dashboard/tasks" className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline">
                Board <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent>
              {myActiveTasks.length === 0 ? (
                <div className="text-sm text-zinc-500 text-center py-8">
                  No active tasks! You are all caught up.
                </div>
              ) : (
                <div className="space-y-3">
                  {myActiveTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-50 line-clamp-1">
                          {task.title}
                        </span>
                        <Badge
                          variant={
                            task.status === "IN_REVIEW"
                              ? "purple"
                              : task.status === "IN_PROGRESS"
                              ? "info"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                      </div>
                      {task.dueDate && (
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <Clock size={11} /> Due {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leave Requests Widget */}
          <Card className="border-0 shadow-md shadow-zinc-200/50 dark:shadow-none dark:bg-zinc-900 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CalendarDays size={18} className="text-amber-500" />
                  Leave Status
                </CardTitle>
                <CardDescription>Your submitted requests</CardDescription>
              </div>
              <Link href="/dashboard/leaves" className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline">
                All <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent>
              {myPendingLeaves.length === 0 ? (
                <div className="text-sm text-zinc-500 text-center py-8">
                  No leave requests submitted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {myPendingLeaves.map((l) => (
                    <div
                      key={l.id}
                      className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                            {l.leaveType.replace("_", " ")}
                          </span>
                          <span className="text-xs text-zinc-500">({l.days} days)</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={l.status === "APPROVED" ? "success" : l.status === "PENDING" ? "warning" : "destructive"}
                        className="text-[10px]"
                      >
                        {l.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Colleagues Widget */}
          <Card className="border-0 shadow-md shadow-zinc-200/50 dark:shadow-none dark:bg-zinc-900 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users size={18} className="text-blue-600 dark:text-blue-400" />
                Team Members
              </CardTitle>
              <CardDescription>{myEmployeeRecord?.department || "Department"}</CardDescription>
            </CardHeader>
            <CardContent>
              {myColleagues.length === 0 ? (
                <div className="text-sm text-zinc-500 text-center py-8">No other colleagues found.</div>
              ) : (
                <div className="space-y-3">
                  {myColleagues.map((colleague) => (
                    <div key={colleague.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-medium text-xs">
                          {colleague.firstName[0]}
                          {colleague.lastName[0]}
                        </div>
                        <div>
                          <p className="text-xs font-semibold leading-none">
                            {colleague.firstName} {colleague.lastName}
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{colleague.position}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // ADMIN / HR VIEW
  // --------------------------------------------------------
  const attendanceRate = employeeCount > 0 ? Math.round((todayPresentCount / employeeCount) * 100) : 100;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Workforce Overview
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time status of intern tasks, attendance, and leave management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/tasks"
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <KanbanSquare size={16} /> Task Board
          </Link>
          <Link
            href="/dashboard/leaves"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <CalendarDays size={16} /> Review Leaves
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Headcount */}
        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl transition-all hover:shadow-xl hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Total Headcount</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center">
              <Users size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{employeeCount}</div>
            <p className="text-xs font-medium text-emerald-600 flex items-center mt-2">
              <TrendingUp size={14} className="mr-1" />
              Active organization roster
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Today's Presence */}
        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl transition-all hover:shadow-xl hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Today&apos;s Attendance</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center">
              <Activity size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {todayPresentCount} <span className="text-sm font-normal text-zinc-500">/ {employeeCount}</span>
            </div>
            <p className="text-xs font-medium text-emerald-600 flex items-center mt-2">
              <CheckCircle2 size={14} className="mr-1" />
              {attendanceRate}% present today
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Task Progress */}
        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl transition-all hover:shadow-xl hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Task Completion</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 flex items-center justify-center">
              <KanbanSquare size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {doneTasks} <span className="text-sm font-normal text-zinc-500">/ {totalTasks}</span>
            </div>
            <p className="text-xs font-medium text-purple-600 flex items-center mt-2">
              <Sparkles size={14} className="mr-1" />
              {reviewQueueTasks.length} deliverables in review
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Pending Leaves */}
        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl transition-all hover:shadow-xl hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Pending Leaves</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 flex items-center justify-center">
              <CalendarDays size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{pendingLeaves.length}</div>
            <p className="text-xs font-medium text-amber-600 flex items-center mt-2">
              <Clock size={14} className="mr-1" />
              Requires management review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Tasks In Review + Pending Leaves */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Deliverables in Review Widget */}
        <Card className="border-0 shadow-md shadow-zinc-200/50 dark:shadow-none dark:bg-zinc-900 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles size={18} className="text-purple-600 dark:text-purple-400" />
                Deliverables In Review
              </CardTitle>
              <CardDescription>Submitted PRs & artifacts needing evaluation</CardDescription>
            </div>
            <Link
              href="/dashboard/tasks"
              className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
            >
              Task Board <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent>
            {reviewQueueTasks.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2 opacity-70" />
                <p className="text-sm font-medium">All deliverables reviewed! No tasks waiting.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviewQueueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                          {task.title}
                        </span>
                        <Badge variant="purple" className="text-[10px]">In Review</Badge>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Assigned to: {task.assignee?.firstName} {task.assignee?.lastName} ({task.assignee?.department})
                      </p>
                    </div>

                    <Link
                      href="/dashboard/tasks"
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Leave Requests Review Center */}
        <Card className="border-0 shadow-md shadow-zinc-200/50 dark:shadow-none dark:bg-zinc-900 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CalendarDays size={18} className="text-amber-500" />
                Leave Approvals
              </CardTitle>
              <CardDescription>Applications needing HR or Manager action</CardDescription>
            </div>
            <Link
              href="/dashboard/leaves"
              className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
            >
              Leave Center <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent>
            {pendingLeaves.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2 opacity-70" />
                <p className="text-sm font-medium">All caught up! No pending leave requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                          {leave.employee.firstName} {leave.employee.lastName}
                        </span>
                        <span className="text-xs text-zinc-500">({leave.employee.department})</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                        Reason: {leave.reason} ({leave.days} days)
                      </p>
                    </div>

                    <Link
                      href="/dashboard/leaves"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
