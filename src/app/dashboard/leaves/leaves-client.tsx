"use client";

import { useState } from "react";
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  AlertCircle,
  Trash2,
  FileText,
  User,
  Check,
  X,
  CalendarCheck,
  GraduationCap,
  HeartPulse,
  Palmtree,
  HelpCircle
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
import { requestLeave, reviewLeaveRequest, cancelLeaveRequest } from "@/app/actions/leave";

interface LeaveItem {
  id: string;
  employeeId: string;
  leaveType: "SICK" | "CASUAL" | "EXAM_STUDY" | "ANNUAL" | "UNPAID";
  startDate: string | Date;
  endDate: string | Date;
  days: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | Date | null;
  createdAt: string | Date;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    department: string;
    position: string;
    userId: string | null;
    user?: {
      email: string;
    } | null;
  };
}

interface Props {
  userRole: string;
  currentUserId: string;
  currentEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    department: string;
  } | null;
  leaves: LeaveItem[];
}

export function LeavesClient({
  userRole,
  currentUserId,
  currentEmployee,
  leaves: initialLeaves,
}: Props) {
  const [leaves, setLeaves] = useState<LeaveItem[]>(initialLeaves);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Apply form state
  const [leaveType, setLeaveType] = useState<"CASUAL" | "SICK" | "EXAM_STUDY" | "ANNUAL" | "UNPAID">("CASUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Dialog state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [targetLeave, setTargetLeave] = useState<LeaveItem | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNote, setReviewNote] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  const isPrivileged = userRole === "ADMIN" || userRole === "HR";

  // Calculate day difference for preview in modal
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (s > e) return 0;
    const diff = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      setStatusMessage({ text: "Please complete all fields", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await requestLeave({
        leaveType,
        startDate,
        endDate,
        reason,
      });
      setIsApplyModalOpen(false);
      setStartDate("");
      setEndDate("");
      setReason("");
      setStatusMessage({ text: "Leave request submitted successfully for approval", type: "success" });
      window.location.reload();
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to submit leave request", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewModal = (leave: LeaveItem, action: "APPROVED" | "REJECTED") => {
    setTargetLeave(leave);
    setReviewAction(action);
    setReviewNote(action === "APPROVED" ? "Approved" : "Request declined");
    setReviewModalOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!targetLeave) return;
    setIsReviewing(true);
    try {
      await reviewLeaveRequest({
        id: targetLeave.id,
        status: reviewAction,
        reviewNote,
      });
      setReviewModalOpen(false);
      setStatusMessage({
        text: `Leave request has been marked as ${reviewAction.toLowerCase()}`,
        type: "success",
      });
      window.location.reload();
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to review request", type: "error" });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleCancelLeave = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this leave request?")) return;
    try {
      await cancelLeaveRequest(id);
      setLeaves(leaves.filter((l) => l.id !== id));
      setStatusMessage({ text: "Leave request cancelled", type: "success" });
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to cancel request", type: "error" });
    }
  };

  // Metrics
  const pendingCount = leaves.filter((l) => l.status === "PENDING").length;
  const approvedCount = leaves.filter((l) => l.status === "APPROVED").length;
  const rejectedCount = leaves.filter((l) => l.status === "REJECTED").length;
  const myTotalLeaveDays = leaves
    .filter((l) => l.status === "APPROVED" && l.employee.userId === currentUserId)
    .reduce((acc, curr) => acc + curr.days, 0);

  // Filter leaves
  const filteredLeaves = leaves.filter((l) => {
    const name = `${l.employee.firstName} ${l.employee.lastName}`.toLowerCase();
    const dept = l.employee.department.toLowerCase();
    const rsn = l.reason.toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = name.includes(term) || dept.includes(term) || rsn.includes(term);
    const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getLeaveTypeBadge = (type: LeaveItem["leaveType"]) => {
    switch (type) {
      case "SICK":
        return (
          <Badge variant="destructive" className="flex items-center gap-1 font-medium">
            <HeartPulse size={12} /> Sick Leave
          </Badge>
        );
      case "CASUAL":
        return (
          <Badge variant="info" className="flex items-center gap-1 font-medium">
            <Palmtree size={12} /> Casual Leave
          </Badge>
        );
      case "EXAM_STUDY":
        return (
          <Badge variant="purple" className="flex items-center gap-1 font-medium">
            <GraduationCap size={12} /> Exam / Study
          </Badge>
        );
      case "ANNUAL":
        return (
          <Badge variant="success" className="flex items-center gap-1 font-medium">
            <CalendarCheck size={12} /> Annual Vacation
          </Badge>
        );
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: LeaveItem["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock size={12} /> Pending Review
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 size={12} /> Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle size={12} /> Rejected
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Leave Management
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Submit time-off requests, manage exam & study leaves, and review approvals.
          </p>
        </div>

        {currentEmployee && (
          <Button
            onClick={() => setIsApplyModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Request Time Off
          </Button>
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

      {/* Overview Metric Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Pending Approvals
            </CardTitle>
            <Clock size={18} className="text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {pendingCount}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {isPrivileged ? "Requires management review" : "Awaiting response"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Approved Requests
            </CardTitle>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {approvedCount}
            </div>
            <p className="text-xs text-zinc-500 mt-1">Successfully granted</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Rejected Requests
            </CardTitle>
            <XCircle size={18} className="text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {rejectedCount}
            </div>
            <p className="text-xs text-zinc-500 mt-1">Declined applications</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {isPrivileged ? "Total Leave Requests" : "My Approved Leave Days"}
            </CardTitle>
            <CalendarCheck size={18} className="text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {isPrivileged ? leaves.length : `${myTotalLeaveDays} days`}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {isPrivileged ? "All-time history" : "Total approved leave this year"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-0 shadow-xl shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Leave Applications
              </CardTitle>
              <CardDescription>
                Track status, review notes, and approval history
              </CardDescription>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Search name, reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                />
              </div>

              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium">
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === tab
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-100/75 dark:bg-zinc-950/75 text-zinc-500 dark:text-zinc-400 font-semibold text-xs uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Leave Type</th>
                  <th className="px-4 py-3.5">Date Range</th>
                  <th className="px-4 py-3.5">Duration</th>
                  <th className="px-4 py-3.5">Reason</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Review Info</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {filteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                      <CalendarDays className="h-8 w-8 mx-auto mb-2 text-zinc-400 opacity-50" />
                      No leave applications found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredLeaves.map((item) => {
                    const start = new Date(item.startDate);
                    const end = new Date(item.endDate);
                    const isApplicant = item.employee.userId === currentUserId;

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
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getLeaveTypeBadge(item.leaveType)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                          {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} —{" "}
                          {end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                          {item.days} {item.days === 1 ? "day" : "days"}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-600 dark:text-zinc-400 max-w-xs">
                          <p className="line-clamp-2" title={item.reason}>
                            {item.reason}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-600 dark:text-zinc-400">
                          {item.reviewedBy ? (
                            <div>
                              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                {item.reviewedBy}
                              </span>
                              {item.reviewNote && (
                                <span className="block text-zinc-500 italic">
                                  &ldquo;{item.reviewNote}&rdquo;
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-400">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPrivileged && item.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => openReviewModal(item, "APPROVED")}
                                  className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs flex items-center gap-1 shadow-sm"
                                >
                                  <Check size={14} /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openReviewModal(item, "REJECTED")}
                                  className="h-8 px-2.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs flex items-center gap-1"
                                >
                                  <X size={14} /> Reject
                                </Button>
                              </>
                            )}

                            {(isApplicant && item.status === "PENDING") || isPrivileged ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelLeave(item.id)}
                                className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                                title="Cancel / Delete Request"
                              >
                                <Trash2 size={16} />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Apply Leave Modal */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleApplyLeave}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Request Time Off</DialogTitle>
              <DialogDescription>
                Submit an official leave application to your manager or HR team.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="leaveType">Leave Type</Label>
                <select
                  id="leaveType"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm font-medium"
                >
                  <option value="CASUAL">Casual Leave (Personal / Rest)</option>
                  <option value="SICK">Sick / Medical Leave</option>
                  <option value="EXAM_STUDY">Exam Preparation / College Study Leave</option>
                  <option value="ANNUAL">Annual Planned Vacation</option>
                  <option value="UNPAID">Unpaid Leave of Absence</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {startDate && endDate && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-xs text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-between">
                  <span>Calculated Duration:</span>
                  <span className="text-sm font-bold">{calculateDays()} calendar days</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason / Coverage Plan</Label>
                <textarea
                  id="reason"
                  required
                  rows={3}
                  placeholder="Explain the reason and how your responsibilities are covered..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApplyModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Dialog for Admin/HR */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {reviewAction === "APPROVED" ? "Approve Leave Request" : "Reject Leave Request"}
            </DialogTitle>
            <DialogDescription>
              {targetLeave && (
                <span>
                  Applicant: <strong>{targetLeave.employee.firstName} {targetLeave.employee.lastName}</strong> ({targetLeave.days} days)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reviewNote">Feedback / Note to Applicant</Label>
              <Input
                id="reviewNote"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="e.g. Approved, enjoy your break! or Project milestone conflict"
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReview}
              disabled={isReviewing}
              className={`text-white rounded-xl shadow-md ${
                reviewAction === "APPROVED"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {isReviewing ? "Processing..." : `Confirm ${reviewAction === "APPROVED" ? "Approval" : "Rejection"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
