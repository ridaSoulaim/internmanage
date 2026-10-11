"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Search,
  Plus,
  Trash2,
  UserCheck,
  Timer
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { clockIn, clockOut, adminRecordAttendance, deleteAttendanceRecord } from "@/app/actions/attendance";

interface AttendanceItem {
  id: string;
  employeeId: string;
  date: string | Date;
  checkIn: string | Date | null;
  checkOut: string | Date | null;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LATE" | "REMOTE";
  workNotes: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    department: string;
    position: string;
    user?: {
      email: string;
    } | null;
  };
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
}

interface Props {
  userRole: string;
  currentEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    department: string;
  } | null;
  todayAttendance: AttendanceItem | null;
  attendances: AttendanceItem[];
  allEmployees: EmployeeOption[];
}

export function AttendanceClient({
  userRole,
  currentEmployee,
  todayAttendance: initialTodayAttendance,
  attendances: initialAttendances,
  allEmployees,
}: Props) {
  const [todayAttendance] = useState<AttendanceItem | null>(initialTodayAttendance);
  const [attendances, setAttendances] = useState<AttendanceItem[]>(initialAttendances);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [clockInNotes, setClockInNotes] = useState("");
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [isClockInLoading, setIsClockInLoading] = useState(false);
  const [isClockOutLoading, setIsClockOutLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");

  // Admin Manual Record Dialog
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualEmpId, setManualEmpId] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualCheckIn, setManualCheckIn] = useState("09:00");
  const [manualCheckOut, setManualCheckOut] = useState("17:00");
  const [manualStatus, setManualStatus] = useState<"PRESENT" | "ABSENT" | "HALF_DAY" | "LATE" | "REMOTE">("PRESENT");
  const [manualNotes, setManualNotes] = useState("");
  const [isManualLoading, setIsManualLoading] = useState(false);

  const isPrivileged = userRole === "ADMIN" || userRole === "HR";

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    const initialTick = setTimeout(() => {
      setCurrentTime(new Date());
    }, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(initialTick);
    };
  }, []);

  // Calculate elapsed time if checked in but not checked out
  useEffect(() => {
    if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
      const checkInTime = new Date(todayAttendance.checkIn).getTime();
      const interval = setInterval(() => {
        const now = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((now - checkInTime) / 1000)));
      }, 1000);
      const initialTimer = setTimeout(() => {
        const now = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((now - checkInTime) / 1000)));
      }, 0);
      return () => {
        clearInterval(interval);
        clearTimeout(initialTimer);
      };
    } else {
      const resetTimer = setTimeout(() => {
        setElapsedSeconds(0);
      }, 0);
      return () => clearTimeout(resetTimer);
    }
  }, [todayAttendance]);

  const formatElapsedTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  };

  const handleClockIn = async () => {
    setIsClockInLoading(true);
    setStatusMessage(null);
    try {
      const res = await clockIn(clockInNotes);
      setStatusMessage({ text: res.message, type: "success" });
      setClockInNotes("");
      window.location.reload();
    } catch (err: unknown) {
      setStatusMessage({ text: err instanceof Error ? err.message : "Failed to clock in", type: "error" });
    } finally {
      setIsClockInLoading(false);
    }
  };

  const handleClockOut = async () => {
    setIsClockOutLoading(true);
    setStatusMessage(null);
    try {
      const res = await clockOut(clockOutNotes);
      setStatusMessage({ text: res.message, type: "success" });
      setClockOutNotes("");
      window.location.reload();
    } catch (err: unknown) {
      setStatusMessage({ text: err instanceof Error ? err.message : "Failed to clock out", type: "error" });
    } finally {
      setIsClockOutLoading(false);
    }
  };

  const handleSaveManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmpId) {
      setStatusMessage({ text: "Please select an employee", type: "error" });
      return;
    }
    setIsManualLoading(true);
    try {
      await adminRecordAttendance({
        employeeId: manualEmpId,
        date: manualDate,
        checkIn: manualCheckIn,
        checkOut: manualCheckOut,
        status: manualStatus,
        workNotes: manualNotes,
      });
      setIsManualModalOpen(false);
      setStatusMessage({ text: "Attendance record saved successfully", type: "success" });
      window.location.reload();
    } catch (err: unknown) {
      setStatusMessage({ text: err instanceof Error ? err.message : "Failed to save record", type: "error" });
    } finally {
      setIsManualLoading(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attendance record?")) return;
    try {
      await deleteAttendanceRecord(id);
      setAttendances(attendances.filter((a) => a.id !== id));
      setStatusMessage({ text: "Record deleted", type: "success" });
    } catch (err: unknown) {
      setStatusMessage({ text: err instanceof Error ? err.message : "Failed to delete record", type: "error" });
    }
  };

  // Distinct departments for filter
  const departments = Array.from(new Set(allEmployees.map((e) => e.department))).filter(Boolean);

  // Filter attendance records
  const filteredAttendances = attendances.filter((item) => {
    const fullName = `${item.employee.firstName} ${item.employee.lastName}`.toLowerCase();
    const dept = item.employee.department.toLowerCase();
    const email = item.employee.user?.email?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();

    const matchesSearch = fullName.includes(term) || dept.includes(term) || email.includes(term);
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    const matchesDept = departmentFilter === "ALL" || item.employee.department === departmentFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  // Calculate statistics
  const presentTodayCount = attendances.filter((a) => {
    const isToday = new Date(a.date).toDateString() === new Date().toDateString();
    return isToday && (a.status === "PRESENT" || a.status === "LATE");
  }).length;

  const lateTodayCount = attendances.filter((a) => {
    const isToday = new Date(a.date).toDateString() === new Date().toDateString();
    return isToday && a.status === "LATE";
  }).length;

  const remoteTodayCount = attendances.filter((a) => {
    const isToday = new Date(a.date).toDateString() === new Date().toDateString();
    return isToday && a.status === "REMOTE";
  }).length;

  const getStatusBadge = (status: AttendanceItem["status"]) => {
    switch (status) {
      case "PRESENT":
        return <Badge variant="success">Present</Badge>;
      case "LATE":
        return <Badge variant="warning">Late Arrival</Badge>;
      case "REMOTE":
        return <Badge variant="info">Remote</Badge>;
      case "HALF_DAY":
        return <Badge variant="purple">Half Day</Badge>;
      case "ABSENT":
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateHours = (checkIn: string | Date | null, checkOut: string | Date | null) => {
    if (!checkIn) return "—";
    if (!checkOut) return "In Progress";
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    const diff = (end - start) / (1000 * 60 * 60);
    return `${diff.toFixed(1)} hrs`;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Attendance Management
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Track daily presence, digital punch-in/out, and working hours across your team.
          </p>
        </div>

        {isPrivileged && (
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsManualModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 rounded-xl flex items-center gap-2"
            >
              <Plus size={18} />
              Manual Attendance Log
            </Button>
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 shadow-sm border ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
          }`}
        >
          {statusMessage.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium text-sm">{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="ml-auto text-xs opacity-70 hover:opacity-100 font-semibold uppercase tracking-wider"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Section: Live Clock & Punch Card (Visible to all, tailored for active employee) */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Live Digital Punch Card */}
        <Card className="md:col-span-2 border-0 shadow-xl shadow-zinc-200/50 dark:shadow-none dark:bg-zinc-900/90 rounded-2xl overflow-hidden relative border border-zinc-200/60 dark:border-zinc-800">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Timer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Live Digital Punch In / Out
                </CardTitle>
                <CardDescription>
                  {currentEmployee
                    ? `${currentEmployee.firstName} ${currentEmployee.lastName} (${currentEmployee.department})`
                    : "Administrator Overview"}
                </CardDescription>
              </div>

              {/* Status Indicator */}
              <div>
                {!todayAttendance?.checkIn ? (
                  <Badge variant="secondary" className="px-3 py-1 text-xs uppercase font-bold tracking-wider">
                    Not Clocked In
                  </Badge>
                ) : !todayAttendance?.checkOut ? (
                  <Badge variant="success" className="px-3 py-1 text-xs uppercase font-bold tracking-wider animate-pulse">
                    Currently Working
                  </Badge>
                ) : (
                  <Badge variant="info" className="px-3 py-1 text-xs uppercase font-bold tracking-wider">
                    Shift Completed
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6 items-center">
              {/* Digital Clock Display */}
              <div className="bg-zinc-50 dark:bg-zinc-950/80 p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
                <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Current Time</span>
                <span className="text-4xl font-mono font-black text-zinc-900 dark:text-zinc-50 my-1">
                  {currentTime ? currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  {currentTime ? currentTime.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "short", day: "numeric" }) : ""}
                </span>

                {/* Elapsed Work Timer if checked in */}
                {todayAttendance?.checkIn && !todayAttendance?.checkOut && (
                  <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 w-full flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                    <Clock size={16} className="animate-spin" />
                    <span>Duration: {formatElapsedTime(elapsedSeconds)}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons & Input */}
              <div className="space-y-4">
                {currentEmployee ? (
                  <>
                    {!todayAttendance?.checkIn ? (
                      <div className="space-y-3">
                        <Input
                          placeholder="What will you work on today? (optional)"
                          value={clockInNotes}
                          onChange={(e) => setClockInNotes(e.target.value)}
                          className="rounded-xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                        />
                        <Button
                          onClick={handleClockIn}
                          disabled={isClockInLoading}
                          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                        >
                          <Play size={18} />
                          {isClockInLoading ? "Processing..." : "Clock In for Today"}
                        </Button>
                      </div>
                    ) : !todayAttendance?.checkOut ? (
                      <div className="space-y-3">
                        <Input
                          placeholder="Summary of today's achievements / tasks"
                          value={clockOutNotes}
                          onChange={(e) => setClockOutNotes(e.target.value)}
                          className="rounded-xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                        />
                        <Button
                          onClick={handleClockOut}
                          disabled={isClockOutLoading}
                          className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                        >
                          <Square size={18} />
                          {isClockOutLoading ? "Processing..." : "Clock Out & Wrap Up"}
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-xl text-center space-y-1">
                        <p className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
                          Shift Finished for Today
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          Checked in at {new Date(todayAttendance.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •
                          Checked out at {new Date(todayAttendance.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-center text-sm text-zinc-600 dark:text-zinc-400">
                    You are logged in as an Administrator/HR. You can manage and review company attendance logs below or log attendance manually on behalf of interns.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Metrics Card */}
        <div className="space-y-4">
          <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                <span>Present Today</span>
                <UserCheck size={18} className="text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{presentTodayCount}</span>
                {remoteTodayCount > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    +{remoteTodayCount} Remote
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Out of {allEmployees.length} total registered team members
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                <span>Late Arrivals Today</span>
                <AlertCircle size={18} className="text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
                {lateTodayCount}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Clocked in after 09:30 AM</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attendance History & Records Table */}
      <Card className="border-0 shadow-xl shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Attendance Records & Logs
              </CardTitle>
              <CardDescription>
                Detailed overview of employee clock-in timestamps, status, and duration
              </CardDescription>
            </div>

            {/* Table Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Search name, department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-medium text-zinc-700 dark:text-zinc-300"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="REMOTE">Remote</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ABSENT">Absent</option>
              </select>

              {departments.length > 0 && (
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-9 px-3 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-medium text-zinc-700 dark:text-zinc-300"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-100/75 dark:bg-zinc-950/75 text-zinc-500 dark:text-zinc-400 font-semibold text-xs uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Check In</th>
                  <th className="px-4 py-3.5">Check Out</th>
                  <th className="px-4 py-3.5">Working Hours</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Notes</th>
                  {isPrivileged && <th className="px-4 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {filteredAttendances.length === 0 ? (
                  <tr>
                    <td colSpan={isPrivileged ? 8 : 7} className="px-4 py-12 text-center text-zinc-500">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-zinc-400 opacity-50" />
                      No attendance records match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAttendances.map((item) => {
                    const checkInDate = item.checkIn ? new Date(item.checkIn) : null;
                    const checkOutDate = item.checkOut ? new Date(item.checkOut) : null;
                    const recordDate = new Date(item.date);

                    return (
                      <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-50">
                          <div>
                            <span>
                              {item.employee.firstName} {item.employee.lastName}
                            </span>
                            <span className="block text-xs text-zinc-500 font-normal">
                              {item.employee.department} • {item.employee.position}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {recordDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3.5 text-zinc-700 dark:text-zinc-300 font-mono text-xs whitespace-nowrap">
                          {checkInDate ? checkInDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-zinc-700 dark:text-zinc-300 font-mono text-xs whitespace-nowrap">
                          {checkOutDate ? checkOutDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                          {calculateHours(item.checkIn, item.checkOut)}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                          {item.workNotes || "—"}
                        </td>
                        {isPrivileged && (
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecord(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 w-8 p-0 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Admin Manual Log Dialog */}
      <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleSaveManualRecord}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Manual Attendance Entry</DialogTitle>
              <DialogDescription>
                Record or adjust clock-in / clock-out details on behalf of an intern or employee.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="employee">Select Employee</Label>
                <select
                  id="employee"
                  required
                  value={manualEmpId}
                  onChange={(e) => setManualEmpId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
                >
                  <option value="">-- Choose Employee --</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="checkIn">Check In Time</Label>
                  <Input
                    id="checkIn"
                    type="time"
                    value={manualCheckIn}
                    onChange={(e) => setManualCheckIn(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="checkOut">Check Out Time</Label>
                  <Input
                    id="checkOut"
                    type="time"
                    value={manualCheckOut}
                    onChange={(e) => setManualCheckOut(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Attendance Status</Label>
                <select
                  id="status"
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value as AttendanceItem["status"])}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
                >
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late Arrival</option>
                  <option value="REMOTE">Remote / WFH</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ABSENT">Absent</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes / Reason</Label>
                <Input
                  id="notes"
                  placeholder="e.g. Approved remote work, system punch fix"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsManualModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isManualLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
              >
                {isManualLoading ? "Saving..." : "Save Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
