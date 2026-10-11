"use client";

import { useState } from "react";
import {
  KanbanSquare,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Tag,
  User,
  GripVertical,
  Trash2,
  Edit,
  Send,
  MessageSquare,
  Sparkles,
  LayoutGrid,
  List
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
  createTask,
  updateTaskStatus,
  updateTask,
  submitDeliverable,
  reviewTask,
  deleteTask,
} from "@/app/actions/task";

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | Date | null;
  tags: string | null;
  deliverableUrl: string | null;
  reviewFeedback: string | null;
  order: number;
  assigneeId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    department: string;
    position: string;
    user?: {
      email: string;
    } | null;
  } | null;
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
  initialTasks: TaskItem[];
  employees: EmployeeOption[];
}

const COLUMNS: { id: TaskStatus; title: string; color: string; badgeVariant: "secondary" | "info" | "purple" | "success" }[] = [
  { id: "TODO", title: "To Do", color: "border-zinc-300 dark:border-zinc-700", badgeVariant: "secondary" },
  { id: "IN_PROGRESS", title: "In Progress", color: "border-blue-400 dark:border-blue-700", badgeVariant: "info" },
  { id: "IN_REVIEW", title: "In Review", color: "border-purple-400 dark:border-purple-700", badgeVariant: "purple" },
  { id: "DONE", title: "Completed", color: "border-emerald-400 dark:border-emerald-700", badgeVariant: "success" },
];

export function KanbanClient({
  userRole,
  currentUserId,
  currentEmployee,
  initialTasks,
  employees,
}: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Create Task Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("MEDIUM");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState(currentEmployee?.id || "");
  const [newTags, setNewTags] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Deliverable Submission Modal
  const [deliverableModalOpen, setDeliverableModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [deliverableNote, setDeliverableNote] = useState("");
  const [isSubmittingDeliverable, setIsSubmittingDeliverable] = useState(false);

  // Review Modal (For Mentors/Admin)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Edit Task Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTaskData, setEditTaskData] = useState<TaskItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const isPrivileged = userRole === "ADMIN" || userRole === "HR";

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const titleMatch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const descMatch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const tagMatch = t.tags?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesSearch = titleMatch || descMatch || tagMatch;

    const matchesPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === "ALL" || t.assigneeId === assigneeFilter;
    const matchesMyTasks = !myTasksOnly || (currentEmployee && t.assigneeId === currentEmployee.id);

    return matchesSearch && matchesPriority && matchesAssignee && matchesMyTasks;
  });

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("taskId") || draggedTaskId;
    if (!taskId) return;

    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask || targetTask.status === targetStatus) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      await updateTaskStatus(taskId, targetStatus);
    } catch (err: any) {
      setStatusMessage({ text: "Failed to move task: " + err.message, type: "error" });
      // Revert
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: targetTask.status } : t))
      );
    } finally {
      setDraggedTaskId(null);
    }
  };

  // Move task via click button
  const handleMoveStep = async (taskId: string, direction: "next" | "prev") => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const order: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
    const currentIndex = order.indexOf(targetTask.status);
    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex < 0 || nextIndex >= order.length) return;
    const newStatus = order[nextIndex];

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to update task", type: "error" });
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    setStatusMessage(null);
    try {
      const res = await createTask({
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        dueDate: newDueDate || undefined,
        assigneeId: newAssigneeId || undefined,
        tags: newTags,
      });

      setIsCreateModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewTags("");
      setNewDueDate("");
      setStatusMessage({ text: "Task created successfully", type: "success" });
      window.location.reload();
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to create task", type: "error" });
    } finally {
      setIsCreating(false);
    }
  };

  // Submit Deliverable
  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !deliverableUrl.trim()) return;

    setIsSubmittingDeliverable(true);
    try {
      await submitDeliverable(selectedTask.id, deliverableUrl, deliverableNote);
      setDeliverableModalOpen(false);
      setDeliverableUrl("");
      setDeliverableNote("");
      setStatusMessage({ text: "Deliverable submitted! Task moved to In Review.", type: "success" });
      window.location.reload();
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to submit deliverable", type: "error" });
    } finally {
      setIsSubmittingDeliverable(false);
    }
  };

  // Review Deliverable
  const handleReviewDeliverable = async (approved: boolean) => {
    if (!selectedTask) return;
    setIsReviewing(true);
    try {
      await reviewTask(selectedTask.id, approved, reviewFeedback);
      setReviewModalOpen(false);
      setReviewFeedback("");
      setStatusMessage({
        text: approved ? "Task approved and marked as Completed!" : "Changes requested. Task moved back to In Progress.",
        type: "success",
      });
      window.location.reload();
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to submit review", type: "error" });
    } finally {
      setIsReviewing(false);
    }
  };

  // Edit Task
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTaskData) return;

    setIsEditing(true);
    try {
      await updateTask(editTaskData.id, {
        title: editTaskData.title,
        description: editTaskData.description || undefined,
        priority: editTaskData.priority,
        status: editTaskData.status,
        dueDate: editTaskData.dueDate ? new Date(editTaskData.dueDate).toISOString().split("T")[0] : undefined,
        assigneeId: editTaskData.assigneeId || undefined,
        tags: editTaskData.tags || undefined,
        deliverableUrl: editTaskData.deliverableUrl || undefined,
      });
      setEditModalOpen(false);
      setStatusMessage({ text: "Task updated successfully", type: "success" });
      window.location.reload();
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to update task", type: "error" });
    } finally {
      setIsEditing(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setEditModalOpen(false);
      setStatusMessage({ text: "Task deleted", type: "success" });
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Failed to delete task", type: "error" });
    }
  };

  // Badges helper
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">Urgent</Badge>;
      case "HIGH":
        return <Badge variant="warning" className="text-[10px] uppercase font-bold tracking-wider">High</Badge>;
      case "MEDIUM":
        return <Badge variant="info" className="text-[10px] uppercase font-bold tracking-wider">Medium</Badge>;
      case "LOW":
        return <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">Low</Badge>;
    }
  };

  // Stats
  const totalCount = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const inReviewCount = tasks.filter((t) => t.status === "IN_REVIEW").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  const completionRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <KanbanSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Intern Task & Kanban Board
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Assign project milestones, track deliverables, and review code & design submissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
              title="Table List View"
            >
              <List size={16} />
            </button>
          </div>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2"
          >
            <Plus size={18} />
            New Task
          </Button>
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

      {/* Metric Counters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Total Tasks</CardTitle>
            <KanbanSquare size={18} className="text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{totalCount}</div>
            <p className="text-xs text-zinc-500 mt-1">Active project backlog</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">In Progress</CardTitle>
            <Clock size={18} className="text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{inProgressCount}</div>
            <p className="text-xs text-zinc-500 mt-1">Currently being worked on</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Pending Review</CardTitle>
            <Sparkles size={18} className="text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{inReviewCount}</div>
            <p className="text-xs text-zinc-500 mt-1">Awaiting mentor evaluation</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Completed</CardTitle>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{doneCount}</div>
            <p className="text-xs text-emerald-600 font-semibold mt-1">{completionRate}% total completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search tasks, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 px-3 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-medium text-zinc-700 dark:text-zinc-300"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-10 px-3 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-medium text-zinc-700 dark:text-zinc-300"
          >
            <option value="ALL">All Assignees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>

        {currentEmployee && (
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300 select-none">
            <input
              type="checkbox"
              checked={myTasksOnly}
              onChange={(e) => setMyTasksOnly(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            My Assigned Tasks Only
          </label>
        )}
      </div>

      {/* VIEW: KANBAN BOARD */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            const isOver = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-2xl bg-zinc-100/60 dark:bg-zinc-900/50 p-4 border transition-all duration-200 min-h-[500px] ${
                  isOver
                    ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-blue-400/40"
                    : "border-zinc-200/80 dark:border-zinc-800/80"
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-200/60 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                      {col.title}
                    </span>
                    <Badge variant={col.badgeVariant} className="px-2 py-0 text-xs font-bold rounded-full">
                      {colTasks.length}
                    </Badge>
                  </div>
                </div>

                {/* Task Cards */}
                <div className="flex-1 space-y-3.5">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border border-dashed border-zinc-300/80 dark:border-zinc-800 rounded-xl text-xs text-zinc-400">
                      Drop tasks here
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const isAssignedToMe = currentEmployee && task.assigneeId === currentEmployee.id;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className="group bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-zinc-200/80 dark:border-zinc-800/80 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-grab active:cursor-grabbing space-y-3 relative"
                        >
                          {/* Top Row: Priority & Drag Handle & Actions */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getPriorityBadge(task.priority)}
                              {task.tags && (
                                <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[100px]">
                                  #{task.tags.split(",")[0].trim()}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditTaskData(task);
                                  setEditModalOpen(true);
                                }}
                                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                                title="Edit Task"
                              >
                                <Edit size={13} />
                              </button>
                              <GripVertical size={14} className="text-zinc-400" />
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Deliverable URL & Review Note */}
                          {task.deliverableUrl && (
                            <div className="pt-1">
                              <a
                                href={task.deliverableUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[11px] font-semibold border border-blue-200 dark:border-blue-800/80 transition-colors truncate max-w-full"
                              >
                                <ExternalLink size={12} className="shrink-0" />
                                <span className="truncate">Deliverable Link</span>
                              </a>
                            </div>
                          )}

                          {task.reviewFeedback && (
                            <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5">
                              <MessageSquare size={12} className="shrink-0 mt-0.5 text-zinc-400" />
                              <span className="line-clamp-2 italic">{task.reviewFeedback}</span>
                            </div>
                          )}

                          {/* Card Footer: Assignee & Date & Actions */}
                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                              <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">
                                {task.assignee ? task.assignee.firstName[0] : "?"}
                              </div>
                              <span className="text-[11px] font-medium truncate max-w-[90px]">
                                {task.assignee ? task.assignee.firstName : "Unassigned"}
                              </span>
                            </div>

                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                                <Calendar size={11} />
                                <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                              </div>
                            )}
                          </div>

                          {/* Quick Actions (Move & Deliverable / Review) */}
                          <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-dashed border-zinc-100 dark:border-zinc-800/60">
                            <div className="flex items-center gap-1">
                              {task.status !== "TODO" && (
                                <button
                                  onClick={() => handleMoveStep(task.id, "prev")}
                                  className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 text-xs"
                                  title="Move to previous stage"
                                >
                                  <ChevronLeft size={13} />
                                </button>
                              )}
                              {task.status !== "DONE" && (
                                <button
                                  onClick={() => handleMoveStep(task.id, "next")}
                                  className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 text-xs"
                                  title="Move to next stage"
                                >
                                  <ChevronRight size={13} />
                                </button>
                              )}
                            </div>

                            {/* Submit Deliverable button for intern */}
                            {task.status === "IN_PROGRESS" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setDeliverableUrl(task.deliverableUrl || "");
                                  setDeliverableModalOpen(true);
                                }}
                                className="h-6 px-2 text-[10px] rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              >
                                <Send size={10} className="mr-1" /> Submit Work
                              </Button>
                            )}

                            {/* Review button for Mentor/Admin when IN_REVIEW */}
                            {task.status === "IN_REVIEW" && isPrivileged && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setReviewFeedback("");
                                  setReviewModalOpen(true);
                                }}
                                className="h-6 px-2 text-[10px] rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                              >
                                <Sparkles size={10} className="mr-1" /> Review Work
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW: LIST / TABLE VIEW */
        <Card className="border-0 shadow-xl shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-100/75 dark:bg-zinc-950/75 text-zinc-500 font-semibold text-xs uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-5 py-3.5">Task</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Priority</th>
                    <th className="px-5 py-3.5">Assignee</th>
                    <th className="px-5 py-3.5">Due Date</th>
                    <th className="px-5 py-3.5">Deliverable</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                        No tasks match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-50">
                          <div>
                            <span>{t.title}</span>
                            {t.description && (
                              <p className="text-xs text-zinc-500 truncate max-w-md">{t.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <Badge
                            variant={
                              t.status === "DONE"
                                ? "success"
                                : t.status === "IN_REVIEW"
                                ? "purple"
                                : t.status === "IN_PROGRESS"
                                ? "info"
                                : "secondary"
                            }
                          >
                            {t.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">{getPriorityBadge(t.priority)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-400">
                          {t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "Unassigned"}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-zinc-500">
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {t.deliverableUrl ? (
                            <a
                              href={t.deliverableUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              <ExternalLink size={12} /> PR / Link
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditTaskData(t);
                              setEditModalOpen(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL: Create New Task */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <form onSubmit={handleCreateTask}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Create New Task</DialogTitle>
              <DialogDescription>
                Assign a milestone or task to an intern or team member.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  required
                  placeholder="e.g. Build REST API for timesheets"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc">Description & Instructions</Label>
                <textarea
                  id="desc"
                  rows={3}
                  placeholder="Outline requirements, success criteria, resources..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="assignee">Assignee</Label>
                  <select
                    id="assignee"
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
                  >
                    <option value="">-- Unassigned --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="e.g. Frontend, React, Bug"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
              >
                {isCreating ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Submit Deliverable (For Interns) */}
      <Dialog open={deliverableModalOpen} onOpenChange={setDeliverableModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleSubmitDeliverable}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Submit Deliverable for Review</DialogTitle>
              <DialogDescription>
                Provide a link to your Pull Request, Figma design, or live demo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="deliverableUrl">Deliverable URL</Label>
                <Input
                  id="deliverableUrl"
                  required
                  placeholder="https://github.com/.../pull/123 or https://figma.com/..."
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deliverableNote">Notes for Reviewer</Label>
                <textarea
                  id="deliverableNote"
                  rows={3}
                  placeholder="Summarize key changes, test instructions, or questions..."
                  value={deliverableNote}
                  onChange={(e) => setDeliverableNote(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeliverableModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingDeliverable}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
              >
                {isSubmittingDeliverable ? "Submitting..." : "Submit for Review"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Review Deliverable (For Mentors/Admin) */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Review Deliverable</DialogTitle>
            <DialogDescription>
              {selectedTask && (
                <span>
                  Evaluating: <strong>{selectedTask.title}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedTask?.deliverableUrl && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs text-zinc-400 uppercase font-bold block mb-1">Submitted Link</span>
                <a
                  href={selectedTask.deliverableUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline truncate"
                >
                  <ExternalLink size={13} /> {selectedTask.deliverableUrl}
                </a>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="reviewFeedback">Review Notes & Feedback</Label>
              <textarea
                id="reviewFeedback"
                rows={3}
                placeholder="Write feedback for the intern (e.g. Great job! Or Please fix unit tests)..."
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isReviewing}
              onClick={() => handleReviewDeliverable(false)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
            >
              Request Changes
            </Button>
            <Button
              type="button"
              disabled={isReviewing}
              onClick={() => handleReviewDeliverable(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md"
            >
              Approve & Mark Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Edit Task Details */}
      {editTaskData && (
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <form onSubmit={handleSaveEdit}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Edit Task</DialogTitle>
                <DialogDescription>Update task details, assignment, or status.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="editTitle">Title</Label>
                  <Input
                    id="editTitle"
                    required
                    value={editTaskData.title}
                    onChange={(e) => setEditTaskData({ ...editTaskData, title: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editDesc">Description</Label>
                  <textarea
                    id="editDesc"
                    rows={3}
                    value={editTaskData.description || ""}
                    onChange={(e) => setEditTaskData({ ...editTaskData, description: e.target.value })}
                    className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="editStatus">Status</Label>
                    <select
                      id="editStatus"
                      value={editTaskData.status}
                      onChange={(e) => setEditTaskData({ ...editTaskData, status: e.target.value as any })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Completed</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="editPriority">Priority</Label>
                    <select
                      id="editPriority"
                      value={editTaskData.priority}
                      onChange={(e) => setEditTaskData({ ...editTaskData, priority: e.target.value as any })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="editAssignee">Assignee</Label>
                    <select
                      id="editAssignee"
                      value={editTaskData.assigneeId || ""}
                      onChange={(e) => setEditTaskData({ ...editTaskData, assigneeId: e.target.value || null })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
                    >
                      <option value="">-- Unassigned --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="editTags">Tags</Label>
                    <Input
                      id="editTags"
                      value={editTaskData.tags || ""}
                      onChange={(e) => setEditTaskData({ ...editTaskData, tags: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editDeliverable">Deliverable URL</Label>
                  <Input
                    id="editDeliverable"
                    placeholder="https://github.com/..."
                    value={editTaskData.deliverableUrl || ""}
                    onChange={(e) => setEditTaskData({ ...editTaskData, deliverableUrl: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleDeleteTask(editTaskData.id)}
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl gap-1 text-xs"
                >
                  <Trash2 size={14} /> Delete
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditModalOpen(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isEditing}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
                  >
                    {isEditing ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
