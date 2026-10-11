"use client";

import { useState } from "react";
import {
  Award,
  CheckCircle2,
  Clock,
  Plus,
  Star,
  Search,
  Filter,
  TrendingUp,
  AlertCircle,
  FileText,
  UserCheck,
  Calendar,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Trash2,
  Edit,
  GraduationCap,
  Briefcase,
  Layers,
  ThumbsUp,
  RefreshCw,
  Trophy
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
import {
  createMilestone,
  updateMilestoneStatus,
  deleteMilestone,
  createPerformanceReview,
  updatePpoDecision,
  deletePerformanceReview,
} from "@/app/actions/evaluation";

type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
type ReviewCycle = "MID_TERM" | "FINAL" | "MONTHLY_CHECKIN";
type PpoDecision = "UNDER_EVALUATION" | "RECOMMENDED_FOR_PPO" | "PPO_OFFERED" | "EXTEND_INTERNSHIP" | "NO_OFFER";

interface MilestoneItem {
  id: string;
  employeeId: string;
  title: string;
  description: string | null;
  targetWeek: number | null;
  dueDate: string | Date | null;
  status: MilestoneStatus;
  completedAt: string | Date | null;
  mentorFeedback: string | null;
  createdAt: string | Date;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    department: string;
    position: string;
  };
}

interface ReviewItem {
  id: string;
  employeeId: string;
  reviewerName: string;
  reviewCycle: ReviewCycle;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  initiativeScore: number;
  overallScore: number;
  strengths: string;
  areasForGrowth: string | null;
  ppoDecision: PpoDecision;
  createdAt: string | Date;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    department: string;
    position: string;
    userId: string | null;
  };
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
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
  milestones: MilestoneItem[];
  reviews: ReviewItem[];
  employees: EmployeeOption[];
}

export function ReviewsClient({
  userRole,
  currentUserId,
  currentEmployee,
  milestones: initialMilestones,
  reviews: initialReviews,
  employees,
}: Props) {
  const [activeTab, setActiveTab] = useState<"milestones" | "reviews">("milestones");
  const [milestones, setMilestones] = useState<MilestoneItem[]>(initialMilestones);
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [selectedEmpFilter, setSelectedEmpFilter] = useState<string>("ALL");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // New Milestone State
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDesc, setMilestoneDesc] = useState("");
  const [milestoneWeek, setMilestoneWeek] = useState("1");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");
  const [milestoneEmpId, setMilestoneEmpId] = useState(employees[0]?.id || "");
  const [isMilestoneLoading, setIsMilestoneLoading] = useState(false);

  // New Review State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewEmpId, setReviewEmpId] = useState(employees[0]?.id || "");
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle>("MID_TERM");
  const [techScore, setTechScore] = useState(4);
  const [commScore, setCommScore] = useState(4);
  const [probScore, setProbScore] = useState(4);
  const [initScore, setInitScore] = useState(4);
  const [strengths, setStrengths] = useState("");
  const [areasForGrowth, setAreasForGrowth] = useState("");
  const [ppoDecision, setPpoDecision] = useState<PpoDecision>("UNDER_EVALUATION");
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  const isPrivileged = userRole === "ADMIN" || userRole === "HR";

  // Filtered lists
  const filteredMilestones = milestones.filter((m) => {
    return selectedEmpFilter === "ALL" || m.employeeId === selectedEmpFilter;
  });

  const filteredReviews = reviews.filter((r) => {
    return selectedEmpFilter === "ALL" || r.employeeId === selectedEmpFilter;
  });

  // Calculate stats
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === "COMPLETED").length;
  const milestoneCompletionRate = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const avgOverallScore =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.overallScore, 0) / reviews.length).toFixed(1)
      : "5.0";

  const ppoGrantedCount = reviews.filter(
    (r) => r.ppoDecision === "PPO_OFFERED" || r.ppoDecision === "RECOMMENDED_FOR_PPO"
  ).length;

  // Milestone Status Handler
  const handleToggleMilestone = async (m: MilestoneItem) => {
    const nextStatus: MilestoneStatus =
      m.status === "COMPLETED" ? "PENDING" : m.status === "PENDING" ? "IN_PROGRESS" : "COMPLETED";

    setMilestones((prev) =>
      prev.map((item) => (item.id === m.id ? { ...item, status: nextStatus } : item))
    );

    try {
      await updateMilestoneStatus(m.id, nextStatus);
      setStatusMessage({ text: `Milestone status updated to ${nextStatus}`, type: "success" });
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to update milestone", type: "error" });
    }
  };

  // Create Milestone
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim() || !milestoneEmpId) return;

    setIsMilestoneLoading(true);
    try {
      await createMilestone({
        employeeId: milestoneEmpId,
        title: milestoneTitle,
        description: milestoneDesc,
        targetWeek: parseInt(milestoneWeek) || undefined,
        dueDate: milestoneDueDate || undefined,
      });
      setIsMilestoneModalOpen(false);
      setMilestoneTitle("");
      setMilestoneDesc("");
      setStatusMessage({ text: "Milestone added to learning track", type: "success" });
      window.location.reload();
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to create milestone", type: "error" });
    } finally {
      setIsMilestoneLoading(false);
    }
  };

  // Delete Milestone
  const handleDeleteMilestone = async (id: string) => {
    if (!confirm("Delete this milestone?")) return;
    try {
      await deleteMilestone(id);
      setMilestones((prev) => prev.filter((m) => m.id !== id));
      setStatusMessage({ text: "Milestone deleted", type: "success" });
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to delete milestone", type: "error" });
    }
  };

  // Create Review
  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewEmpId || !strengths.trim()) return;

    setIsReviewLoading(true);
    try {
      await createPerformanceReview({
        employeeId: reviewEmpId,
        reviewCycle,
        technicalScore: techScore,
        communicationScore: commScore,
        problemSolvingScore: probScore,
        initiativeScore: initScore,
        strengths,
        areasForGrowth,
        ppoDecision,
      });
      setIsReviewModalOpen(false);
      setStrengths("");
      setAreasForGrowth("");
      setStatusMessage({ text: "Performance evaluation submitted successfully", type: "success" });
      window.location.reload();
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to submit review", type: "error" });
    } finally {
      setIsReviewLoading(false);
    }
  };

  // Update PPO Decision quick action
  const handleUpdatePpo = async (reviewId: string, decision: PpoDecision) => {
    try {
      await updatePpoDecision(reviewId, decision);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, ppoDecision: decision } : r))
      );
      setStatusMessage({ text: `PPO decision updated to ${decision.replace(/_/g, " ")}`, type: "success" });
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to update decision", type: "error" });
    }
  };

  // Delete Review
  const handleDeleteReview = async (id: string) => {
    if (!confirm("Delete this performance review?")) return;
    try {
      await deletePerformanceReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setStatusMessage({ text: "Review deleted", type: "success" });
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to delete review", type: "error" });
    }
  };

  // Helper for PPO Badge
  const getPpoBadge = (decision: PpoDecision) => {
    switch (decision) {
      case "PPO_OFFERED":
        return (
          <Badge variant="success" className="gap-1 font-bold">
            <Trophy size={13} className="text-emerald-600 dark:text-emerald-400" /> PPO Offered 🎉
          </Badge>
        );
      case "RECOMMENDED_FOR_PPO":
        return (
          <Badge variant="info" className="gap-1 font-bold">
            <ThumbsUp size={13} /> Recommended for PPO
          </Badge>
        );
      case "UNDER_EVALUATION":
        return (
          <Badge variant="warning" className="gap-1 font-medium">
            <Clock size={13} /> Under Evaluation
          </Badge>
        );
      case "EXTEND_INTERNSHIP":
        return (
          <Badge variant="purple" className="gap-1 font-medium">
            <RefreshCw size={13} /> Extend Internship
          </Badge>
        );
      case "NO_OFFER":
        return (
          <Badge variant="secondary" className="gap-1">
            Completed (No Offer)
          </Badge>
        );
    }
  };

  const renderStars = (score: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={star <= score ? "text-amber-400 fill-amber-400" : "text-zinc-200 dark:text-zinc-700"}
          />
        ))}
        <span className="text-xs font-bold ml-1 text-zinc-700 dark:text-zinc-300">{score}.0</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <Award className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Milestones & Performance Reviews
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Track internship learning roadmaps, mid-term & final evaluations, and return offers (PPO).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Selector Buttons */}
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("milestones")}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "milestones"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              <Layers size={14} /> Roadmap Milestones
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "reviews"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              <Trophy size={14} /> Performance & PPO
            </button>
          </div>

          {isPrivileged && (
            <>
              {activeTab === "milestones" ? (
                <Button
                  onClick={() => setIsMilestoneModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  <Plus size={18} /> Add Milestone
                </Button>
              ) : (
                <Button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  <Plus size={18} /> New Evaluation
                </Button>
              )}
            </>
          )}
        </div>
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

      {/* Key Metric Highlights */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Average Review GPA</CardTitle>
            <Star size={18} className="text-amber-500 fill-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {avgOverallScore} <span className="text-sm font-normal text-zinc-500">/ 5.0</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Across all evaluated competencies</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Milestones Done</CardTitle>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {completedMilestones} <span className="text-sm font-normal text-zinc-500">/ {totalMilestones}</span>
            </div>
            <p className="text-xs text-emerald-600 font-semibold mt-1">
              {milestoneCompletionRate}% of curriculum completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Return Offers (PPO)</CardTitle>
            <Trophy size={18} className="text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{ppoGrantedCount}</div>
            <p className="text-xs text-blue-600 font-semibold mt-1">Recommended or confirmed conversion</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Total Evaluations</CardTitle>
            <FileText size={18} className="text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{reviews.length}</div>
            <p className="text-xs text-zinc-500 mt-1">Mid-term & final review reports</p>
          </CardContent>
        </Card>
      </div>

      {/* Intern Filter Selector */}
      {isPrivileged && employees.length > 0 && (
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Filter By Intern:</span>
            <select
              value={selectedEmpFilter}
              onChange={(e) => setSelectedEmpFilter(e.target.value)}
              className="h-10 px-3 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-700 dark:text-zinc-300"
            >
              <option value="ALL">All Interns & Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.department})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* TAB 1: MILESTONES & ROADMAP */}
      {activeTab === "milestones" && (
        <div className="space-y-6">
          <Card className="border-0 shadow-xl shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Internship Curriculum & Roadmap
              </CardTitle>
              <CardDescription>
                Week-by-week milestones from onboarding through final capstone evaluation.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {filteredMilestones.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Layers className="h-8 w-8 mx-auto text-zinc-400 mb-2 opacity-60" />
                  No milestones found for this selection.
                </div>
              ) : (
                <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                  {filteredMilestones
                    .sort((a, b) => (a.targetWeek || 0) - (b.targetWeek || 0))
                    .map((m) => {
                      const isDone = m.status === "COMPLETED";
                      const isInProgress = m.status === "IN_PROGRESS";

                      return (
                        <div key={m.id} className="relative group">
                          {/* Timeline node icon */}
                          <div
                            onClick={() => handleToggleMilestone(m)}
                            className={`absolute -left-6 top-1 h-6 w-6 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                              isDone
                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                                : isInProgress
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 animate-pulse"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                            }`}
                            title="Click to toggle status"
                          >
                            <CheckCircle2 size={14} />
                          </div>

                          {/* Milestone Box */}
                          <div className="bg-zinc-50 dark:bg-zinc-950/70 p-5 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                {m.targetWeek && (
                                  <Badge variant="info" className="text-xs font-bold">
                                    Week {m.targetWeek}
                                  </Badge>
                                )}
                                <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
                                  {m.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    isDone
                                      ? "success"
                                      : isInProgress
                                      ? "info"
                                      : "secondary"
                                  }
                                >
                                  {m.status.replace("_", " ")}
                                </Badge>

                                {isPrivileged && (
                                  <button
                                    onClick={() => handleDeleteMilestone(m.id)}
                                    className="p-1 text-zinc-400 hover:text-red-600 transition-colors"
                                    title="Delete milestone"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {m.description && (
                              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                {m.description}
                              </p>
                            )}

                            {m.mentorFeedback && (
                              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                                <MessageSquare size={14} className="shrink-0 mt-0.5 text-blue-500" />
                                <span>
                                  <strong>Mentor Feedback:</strong> {m.mentorFeedback}
                                </span>
                              </div>
                            )}

                            <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
                              <span>
                                Assignee: <strong>{m.employee.firstName} {m.employee.lastName}</strong> ({m.employee.department})
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleMilestone(m)}
                                className="h-7 text-xs font-semibold text-blue-600 hover:text-blue-700"
                              >
                                {isDone ? "Mark Incomplete" : "Mark as Completed"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: PERFORMANCE EVALUATIONS & PPO HUB */}
      {activeTab === "reviews" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {filteredReviews.length === 0 ? (
              <div className="md:col-span-2 text-center py-12 text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <Trophy className="h-8 w-8 mx-auto text-zinc-400 mb-2 opacity-60" />
                No performance evaluations found. Click &ldquo;New Evaluation&rdquo; to assess an intern.
              </div>
            ) : (
              filteredReviews.map((r) => (
                <Card
                  key={r.id}
                  className="border-0 shadow-lg shadow-zinc-200/50 dark:shadow-none dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 overflow-hidden relative space-y-4"
                >
                  <CardHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                          {r.employee.firstName} {r.employee.lastName}
                        </CardTitle>
                        <CardDescription>
                          {r.employee.department} • {r.employee.position}
                        </CardDescription>
                      </div>

                      <div>{getPpoBadge(r.ppoDecision)}</div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {/* Overall GPA & Cycle Header */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-950 dark:to-zinc-900 border border-blue-100 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Evaluation Cycle</span>
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {r.reviewCycle.replace("_", " ")}
                        </h4>
                        <span className="text-[11px] text-zinc-400">By {r.reviewerName}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                          Overall Score
                        </span>
                        <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
                          {r.overallScore.toFixed(1)} <span className="text-sm font-normal text-zinc-500">/ 5.0</span>
                        </div>
                      </div>
                    </div>

                    {/* Competency Ratings */}
                    <div className="space-y-3 pt-1">
                      <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Competency Rubric Breakdown
                      </h5>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/60 dark:border-zinc-800 space-y-1">
                          <span className="font-semibold text-zinc-600 dark:text-zinc-400">Technical Skills</span>
                          {renderStars(r.technicalScore)}
                        </div>

                        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/60 dark:border-zinc-800 space-y-1">
                          <span className="font-semibold text-zinc-600 dark:text-zinc-400">Communication</span>
                          {renderStars(r.communicationScore)}
                        </div>

                        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/60 dark:border-zinc-800 space-y-1">
                          <span className="font-semibold text-zinc-600 dark:text-zinc-400">Problem Solving</span>
                          {renderStars(r.problemSolvingScore)}
                        </div>

                        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/60 dark:border-zinc-800 space-y-1">
                          <span className="font-semibold text-zinc-600 dark:text-zinc-400">Initiative</span>
                          {renderStars(r.initiativeScore)}
                        </div>
                      </div>
                    </div>

                    {/* Qualitative Feedback */}
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1 text-xs">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <Sparkles size={13} /> Key Strengths:
                        </span>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                          {r.strengths}
                        </p>
                      </div>

                      {r.areasForGrowth && (
                        <div className="space-y-1 text-xs">
                          <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <TrendingUp size={13} /> Areas for Growth:
                          </span>
                          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/50">
                            {r.areasForGrowth}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* HR PPO Action Controls */}
                    {isPrivileged && (
                      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-zinc-400">Change Decision:</span>
                          <select
                            value={r.ppoDecision}
                            onChange={(e) => handleUpdatePpo(r.id, e.target.value as any)}
                            className="h-8 px-2 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700"
                          >
                            <option value="UNDER_EVALUATION">Under Evaluation</option>
                            <option value="RECOMMENDED_FOR_PPO">Recommended for PPO</option>
                            <option value="PPO_OFFERED">PPO Offered 🎉</option>
                            <option value="EXTEND_INTERNSHIP">Extend Internship</option>
                            <option value="NO_OFFER">No Offer</option>
                          </select>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReview(r.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 w-8 p-0 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: Add Milestone */}
      <Dialog open={isMilestoneModalOpen} onOpenChange={setIsMilestoneModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleCreateMilestone}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Curriculum Milestone</DialogTitle>
              <DialogDescription>
                Add a target learning goal or project milestone to an intern&apos;s roadmap.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="mEmp">Assignee Intern</Label>
                <select
                  id="mEmp"
                  required
                  value={milestoneEmpId}
                  onChange={(e) => setMilestoneEmpId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mTitle">Milestone Title</Label>
                <Input
                  id="mTitle"
                  required
                  placeholder="e.g. Week 4: Ship First Production PR"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mWeek">Target Week</Label>
                  <Input
                    id="mWeek"
                    type="number"
                    min="1"
                    max="52"
                    value={milestoneWeek}
                    onChange={(e) => setMilestoneWeek(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mDue">Target Due Date</Label>
                  <Input
                    id="mDue"
                    type="date"
                    value={milestoneDueDate}
                    onChange={(e) => setMilestoneDueDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mDesc">Description & Success Criteria</Label>
                <textarea
                  id="mDesc"
                  rows={3}
                  placeholder="Outline expected deliverables, skills to demonstrate..."
                  value={milestoneDesc}
                  onChange={(e) => setMilestoneDesc(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMilestoneModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isMilestoneLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
              >
                {isMilestoneLoading ? "Saving..." : "Add Milestone"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: New Performance Evaluation */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <form onSubmit={handleCreateReview}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">New Performance Evaluation</DialogTitle>
              <DialogDescription>
                Rate competencies, write feedback, and recommend a Return Offer (PPO).
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto px-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rEmp">Intern / Employee</Label>
                  <select
                    id="rEmp"
                    required
                    value={reviewEmpId}
                    onChange={(e) => setReviewEmpId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rCycle">Evaluation Cycle</Label>
                  <select
                    id="rCycle"
                    value={reviewCycle}
                    onChange={(e) => setReviewCycle(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
                  >
                    <option value="MID_TERM">Mid-Term Review</option>
                    <option value="FINAL">Final Capstone Review</option>
                    <option value="MONTHLY_CHECKIN">Monthly Check-in</option>
                  </select>
                </div>
              </div>

              {/* Rubric Rating Sliders / Selectors */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <span className="font-bold text-xs uppercase text-zinc-500 tracking-wider">
                    Competency Rating Rubric (1 - 5 Stars)
                  </span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    Live GPA: {((techScore + commScore + probScore + initScore) / 4).toFixed(1)} / 5.0
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Technical Skills</span>
                      <span className="text-blue-600">{techScore} ★</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={techScore}
                      onChange={(e) => setTechScore(parseInt(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Communication</span>
                      <span className="text-blue-600">{commScore} ★</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={commScore}
                      onChange={(e) => setCommScore(parseInt(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Problem Solving</span>
                      <span className="text-blue-600">{probScore} ★</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={probScore}
                      onChange={(e) => setProbScore(parseInt(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Initiative & Reliability</span>
                      <span className="text-blue-600">{initScore} ★</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={initScore}
                      onChange={(e) => setInitScore(parseInt(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* PPO Return Offer Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="rPpo">Return Offer (PPO) Decision</Label>
                <select
                  id="rPpo"
                  value={ppoDecision}
                  onChange={(e) => setPpoDecision(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm font-semibold"
                >
                  <option value="UNDER_EVALUATION">Under Evaluation (Needs Committee Review)</option>
                  <option value="RECOMMENDED_FOR_PPO">Recommended for Return Offer (PPO)</option>
                  <option value="PPO_OFFERED">PPO Offered (Full-Time Contract Prepared) 🎉</option>
                  <option value="EXTEND_INTERNSHIP">Extend Internship by 1-3 Months</option>
                  <option value="NO_OFFER">Program Completed (No Full-Time Offer)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rStrengths">Key Strengths & Contributions</Label>
                <textarea
                  id="rStrengths"
                  required
                  rows={3}
                  placeholder="Detail high-impact projects, strengths, and work ethic..."
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rGrowth">Areas for Growth & Recommendations</Label>
                <textarea
                  id="rGrowth"
                  rows={2}
                  placeholder="Suggestions for next engineering/professional step..."
                  value={areasForGrowth}
                  onChange={(e) => setAreasForGrowth(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReviewModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isReviewLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
              >
                {isReviewLoading ? "Submitting..." : "Submit Evaluation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
