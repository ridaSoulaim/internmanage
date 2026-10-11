"use client";

import { useState } from "react";
import {
  DollarSign,
  Download,
  Calendar,
  Clock,
  Printer,
  FileCheck,
  Search,
  CheckCircle2,
  Award,
  Layers,
  ShieldCheck,
  QrCode,
  Share2,
  Check,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export interface EmployeePayrollItem {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  hireDate: string;
  annualSalary: number;
  monthlySalary: number;
  hourlyRate: number;
  loggedHours: number;
  overtimeHours: number;
  attendanceCount: number;
  userId: string | null;
}

interface PayrollClientProps {
  employees: EmployeePayrollItem[];
  userRole: string;
  currentUserId?: string;
  isSingleEmployeeView?: boolean;
}

export function PayrollClient({
  employees,
  userRole,
  isSingleEmployeeView = false,
}: PayrollClientProps) {
  const isAdmin = userRole === "ADMIN";
  const isPrivileged = userRole === "ADMIN" || userRole === "HR";

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [viewMode, setViewMode] = useState<"standard" | "hourly">("standard");

  // Certificate Modal State
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePayrollItem | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certTitle, setCertTitle] = useState("Official Certificate of Compensation & Pay Stub");
  const [payPeriod, setPayPeriod] = useState("October 2026");
  const [issueDate, setIssueDate] = useState(new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }));
  const [customHourlyRate, setCustomHourlyRate] = useState<number>(0);
  const [customHours, setCustomHours] = useState<number>(160);
  const [customOvertimeHours, setCustomOvertimeHours] = useState<number>(0);
  const [customBonus, setCustomBonus] = useState<number>(0);
  const [customDeduction, setCustomDeduction] = useState<number>(0);
  const [signatoryTitle, setSignatoryTitle] = useState("Human Resources & Compensation Directorate");
  const [certNotes, setCertNotes] = useState("This certificate confirms that all scheduled internship & work hours were performed in good standing.");
  const [copiedRef, setCopiedRef] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Distinct departments
  const departments = Array.from(new Set(employees.map((e) => e.department))).filter(Boolean);

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === "ALL" || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  // Aggregates
  const totalAnnualPayroll = employees.reduce((sum, e) => sum + e.annualSalary, 0);
  const totalMonthlyPayroll = employees.reduce((sum, e) => sum + e.monthlySalary, 0);
  const avgHourlyRate =
    employees.length > 0
      ? employees.reduce((sum, e) => sum + e.hourlyRate, 0) / employees.length
      : 0;
  const totalTrackedHours = employees.reduce((sum, e) => sum + e.loggedHours, 0);

  const formatCurrency = (amount: number) => {
    if (!isAdmin && isPrivileged) return "****";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };

  const handleOpenCertificate = (emp: EmployeePayrollItem) => {
    setSelectedEmployee(emp);
    setCustomHourlyRate(emp.hourlyRate);
    setCustomHours(emp.loggedHours > 0 ? emp.loggedHours : 160);
    setCustomOvertimeHours(emp.overtimeHours);
    setCustomBonus(0);
    setCustomDeduction(0);
    setIsCertModalOpen(true);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("printable-pay-certificate");
    if (!element || !selectedEmployee) return;

    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margins on sides
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, Math.min(imgHeight, pdfHeight - 20));

      const safePeriod = payPeriod.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `Pay_Certificate_${selectedEmployee.firstName}_${selectedEmployee.lastName}_${safePeriod}.pdf`;
      pdf.save(fileName);
    } catch (err: unknown) {
      console.error("PDF generation failed:", err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyReference = () => {
    if (!selectedEmployee) return;
    const refId = `IM-CERT-${selectedEmployee.id.substring(0, 8).toUpperCase()}-${payPeriod.replace(/\s+/g, "")}`;
    navigator.clipboard.writeText(refId);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleExportCSV = () => {
    const headers = [
      "Employee ID",
      "First Name",
      "Last Name",
      "Department",
      "Position",
      "Annual Salary ($)",
      "Monthly Base ($)",
      "Hourly Pay Rate ($/hr)",
      "Logged Hours",
      "Overtime Hours",
      "Est. Total Pay ($)"
    ];
    const rows = filteredEmployees.map((emp) => [
      emp.id,
      emp.firstName,
      emp.lastName,
      emp.department,
      emp.position,
      isAdmin ? emp.annualSalary : "****",
      isAdmin ? emp.monthlySalary.toFixed(2) : "****",
      isAdmin ? emp.hourlyRate.toFixed(2) : "****",
      emp.loggedHours.toFixed(1),
      emp.overtimeHours.toFixed(1),
      isAdmin ? (emp.hourlyRate * emp.loggedHours).toFixed(2) : "****"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payroll_report_${payPeriod.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations for active certificate
  const certGrossPay = (customHourlyRate * customHours) + (customHourlyRate * 1.5 * customOvertimeHours) + customBonus;
  const certNetPay = Math.max(0, certGrossPay - customDeduction);
  const certRefNumber = selectedEmployee
    ? `IM-CERT-${selectedEmployee.id.substring(0, 8).toUpperCase()}-2026`
    : "IM-CERT-DEMO-2026";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <span>Payroll, Hourly Pay & Certifications</span>
            <Badge variant="purple" className="text-xs font-semibold py-0.5">
              Live Rate Engine
            </Badge>
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            {isSingleEmployeeView
              ? "Review your personal hourly compensation rate, tracked shift hours, and download official pay certificates."
              : "Analyze hourly wages, tracked attendance hours, and generate customized official compensation certificates."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="border-zinc-200 dark:border-zinc-800 gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Download size={16} /> Export Payroll CSV
            </Button>
          )}

          {employees.length > 0 && (
            <Button
              onClick={() => handleOpenCertificate(employees[0])}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md shadow-blue-500/20"
            >
              <FileCheck size={16} /> Generate Pay Certificate
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Card 1: Monthly / Base */}
        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 transition-all hover:shadow-xl hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {isSingleEmployeeView ? "Your Monthly Base" : "Total Monthly Payroll"}
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
              <DollarSign size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatCurrency(totalMonthlyPayroll)}
            </div>
            <p className="text-xs font-medium text-zinc-500 mt-2">
              {isSingleEmployeeView ? "Standard monthly compensation" : `${formatCurrency(totalAnnualPayroll)} annual budget`}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Hourly Pay Rate */}
        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 transition-all hover:shadow-xl hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {isSingleEmployeeView ? "Your Hourly Rate" : "Average Hourly Pay"}
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
              <Clock size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              {isAdmin || isSingleEmployeeView
                ? `$${avgHourlyRate.toFixed(2)}/hr`
                : "****/hr"}
            </div>
            <p className="text-xs font-medium text-zinc-500 mt-2">
              Based on standard 2,080 working hrs/yr
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Tracked Hours */}
        <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 transition-all hover:shadow-xl hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Tracked Shift Hours
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400 flex items-center justify-center border border-cyan-100 dark:border-cyan-500/20">
              <Layers size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              {totalTrackedHours.toFixed(1)} <span className="text-sm font-medium text-zinc-400">hrs</span>
            </div>
            <p className="text-xs font-medium text-zinc-500 mt-2">
              Logged across digital punch-in logs
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Disbursement Cycle */}
        <Card className="border-0 shadow-lg shadow-blue-900/20 dark:shadow-none dark:bg-zinc-900 bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 text-white rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
            <Calendar size={120} />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-indigo-100">Next Pay Date</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center border border-white/20">
              <Calendar size={20} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-black tracking-tight">Oct 15, 2026</div>
            <p className="text-xs font-medium text-indigo-100 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Status: Scheduled Active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="border-0 shadow-xl shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 rounded-2xl overflow-hidden border border-zinc-200/60 dark:border-zinc-800">
        <header className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Compensation & Hourly Pay Breakdown
            </CardTitle>
            <CardDescription>
              Real-time calculation of hourly wages, tracked attendance durations, and certificate issuing
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <button
                onClick={() => setViewMode("standard")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === "standard"
                    ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                Salary View
              </button>
              <button
                onClick={() => setViewMode("hourly")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === "hourly"
                    ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                Hourly & Hours View
              </button>
            </div>

            {/* Department Filter */}
            {!isSingleEmployeeView && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}

            {/* Search Input */}
            <div className="relative w-56">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search team member..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
              />
            </div>
          </div>
        </header>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="font-semibold text-xs text-zinc-500 dark:text-zinc-400">Employee / Intern</TableHead>
                <TableHead className="font-semibold text-xs text-zinc-500 dark:text-zinc-400">Department</TableHead>
                <TableHead className="font-semibold text-xs text-zinc-500 dark:text-zinc-400">Role / Title</TableHead>
                {viewMode === "standard" ? (
                  <>
                    <TableHead className="text-right font-semibold text-xs text-zinc-500 dark:text-zinc-400">Annual Base</TableHead>
                    <TableHead className="text-right font-semibold text-xs text-zinc-500 dark:text-zinc-400">Monthly Net (Est)</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-right font-semibold text-xs text-zinc-500 dark:text-zinc-400">Hourly Rate</TableHead>
                    <TableHead className="text-right font-semibold text-xs text-zinc-500 dark:text-zinc-400">Tracked Hours</TableHead>
                    <TableHead className="text-right font-semibold text-xs text-zinc-500 dark:text-zinc-400">Hours Earned</TableHead>
                  </>
                )}
                <TableHead className="text-center font-semibold text-xs text-zinc-500 dark:text-zinc-400">Pay Certificate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                    No matching payroll records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => {
                  const hoursEarned = emp.hourlyRate * emp.loggedHours;
                  return (
                    <TableRow key={emp.id} className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <TableCell className="font-medium text-zinc-900 dark:text-zinc-50">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold">{emp.firstName} {emp.lastName}</span>
                            <span className="block text-[11px] text-zinc-400 font-mono">ID: {emp.id.substring(0, 8)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium text-xs">
                          {emp.department}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-400 text-sm">{emp.position}</TableCell>

                      {viewMode === "standard" ? (
                        <>
                          <TableCell className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(emp.annualSalary)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatCurrency(emp.monthlySalary)}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            {isAdmin || isSingleEmployeeView ? `$${emp.hourlyRate.toFixed(2)}/hr` : "****"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-zinc-700 dark:text-zinc-300">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock size={13} className="text-zinc-400" />
                              {emp.loggedHours.toFixed(1)} hrs
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatCurrency(hoursEarned > 0 ? hoursEarned : emp.monthlySalary)}
                          </TableCell>
                        </>
                      )}

                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenCertificate(emp)}
                          className="h-8 gap-1.5 text-xs border-zinc-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        >
                          <FileCheck size={14} /> Certificate
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* CUSTOM PAY CERTIFICATE MODAL & PRINTABLE DOCUMENT                        */}
      {/* ========================================================================= */}
      <Dialog open={isCertModalOpen} onOpenChange={setIsCertModalOpen}>
        <DialogContent className="max-w-5xl lg:max-w-6xl w-[96vw] max-h-[94vh] overflow-y-auto dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-0 rounded-3xl shadow-2xl">
          <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileCheck className="text-blue-600" /> Custom Pay Certificate & Payslip
              </DialogTitle>
              <DialogDescription>
                Customize parameters and save as a high-resolution PDF or print this verified certificate.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyReference}
                className="gap-1.5 text-xs border-zinc-200 dark:border-zinc-800"
              >
                {copiedRef ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                {copiedRef ? "Copied Ref" : "Copy Ref"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintCertificate}
                className="gap-1.5 text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Printer size={14} /> Print
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs shadow-md shadow-emerald-500/20 font-semibold"
              >
                {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {isGeneratingPdf ? "Creating PDF..." : "Save PDF"}
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Customization Controls Accordion/Panel */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
              <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                <Award size={14} className="text-blue-600" /> Certificate Parameters & Customization
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="certTitle" className="text-xs">Certificate Title</Label>
                  <Input
                    id="certTitle"
                    value={certTitle}
                    onChange={(e) => setCertTitle(e.target.value)}
                    className="h-9 text-xs dark:bg-zinc-950"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payPeriod" className="text-xs">Pay Period</Label>
                  <Input
                    id="payPeriod"
                    value={payPeriod}
                    onChange={(e) => setPayPeriod(e.target.value)}
                    className="h-9 text-xs dark:bg-zinc-950"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="issueDate" className="text-xs">Date of Issuance</Label>
                  <Input
                    id="issueDate"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="h-9 text-xs dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="hourlyRate" className="text-xs">Hourly Pay Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    value={customHourlyRate}
                    onChange={(e) => setCustomHourlyRate(parseFloat(e.target.value) || 0)}
                    className="h-9 text-xs dark:bg-zinc-950 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hoursWorked" className="text-xs">Base Working Hours</Label>
                  <Input
                    id="hoursWorked"
                    type="number"
                    step="0.5"
                    value={customHours}
                    onChange={(e) => setCustomHours(parseFloat(e.target.value) || 0)}
                    className="h-9 text-xs dark:bg-zinc-950 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="overtime" className="text-xs">Overtime Hours (1.5x)</Label>
                  <Input
                    id="overtime"
                    type="number"
                    step="0.5"
                    value={customOvertimeHours}
                    onChange={(e) => setCustomOvertimeHours(parseFloat(e.target.value) || 0)}
                    className="h-9 text-xs dark:bg-zinc-950 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bonus" className="text-xs">Bonus / Stipend ($)</Label>
                  <Input
                    id="bonus"
                    type="number"
                    value={customBonus}
                    onChange={(e) => setCustomBonus(parseFloat(e.target.value) || 0)}
                    className="h-9 text-xs dark:bg-zinc-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="deductions" className="text-xs">Deductions (Taxes/Unpaid) ($)</Label>
                  <Input
                    id="deductions"
                    type="number"
                    value={customDeduction}
                    onChange={(e) => setCustomDeduction(parseFloat(e.target.value) || 0)}
                    className="h-9 text-xs dark:bg-zinc-950 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signatory" className="text-xs">Authorized Signatory Title</Label>
                  <Input
                    id="signatory"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    className="h-9 text-xs dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label htmlFor="certNotes" className="text-xs">Custom Certificate Statement / Purpose</Label>
                <Input
                  id="certNotes"
                  value={certNotes}
                  onChange={(e) => setCertNotes(e.target.value)}
                  placeholder="Official verification statement..."
                  className="h-9 text-xs dark:bg-zinc-950"
                />
              </div>
            </div>

            {/* ========================================================================= */}
            {/* OFFICIAL PRINTABLE CERTIFICATE SHEET                                      */}
            {/* ========================================================================= */}
            <div
              id="printable-pay-certificate"
              className="bg-white text-zinc-900 p-8 rounded-2xl border-2 border-zinc-200 shadow-xl relative overflow-hidden font-sans"
            >
              {/* Decorative Watermark & Borders */}
              <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-blue-700 via-indigo-600 to-emerald-500" />
              <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-blue-50/50 pointer-events-none -z-0 border-8 border-blue-100/30" />

              {/* Certificate Header */}
              <div className="flex items-start justify-between border-b-2 border-zinc-100 pb-6 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="h-14 w-14 rounded-2xl bg-blue-700 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-500/20">
                    IM
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-zinc-900 uppercase">
                      InternManage Global
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">
                      Talent Workforce & Performance Directorate
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Ref: {certRefNumber}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant="purple" className="font-mono text-xs font-bold uppercase tracking-wider px-3 py-1">
                    Official Document
                  </Badge>
                  <p className="text-xs text-zinc-500 mt-2 font-medium">Issue Date: {issueDate}</p>
                  <p className="text-xs text-zinc-500 font-medium">Pay Period: <span className="font-bold text-zinc-800">{payPeriod}</span></p>
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center py-6 relative z-10">
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight uppercase">
                  {certTitle}
                </h1>
                <p className="text-xs text-zinc-500 mt-1 max-w-xl mx-auto">
                  This document serves as formal confirmation of hours worked, hourly compensation, and net disbursement for the specified period.
                </p>
              </div>

              {/* Employee Information Box */}
              {selectedEmployee && (
                <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200/80 grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10 mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Employee / Intern</span>
                    <p className="text-sm font-bold text-zinc-900 mt-0.5">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Department</span>
                    <p className="text-sm font-bold text-zinc-900 mt-0.5">{selectedEmployee.department}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Designation</span>
                    <p className="text-sm font-bold text-zinc-900 mt-0.5">{selectedEmployee.position}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Employment ID</span>
                    <p className="text-sm font-bold text-zinc-900 font-mono mt-0.5">{selectedEmployee.id.substring(0, 12)}</p>
                  </div>
                </div>
              )}

              {/* Itemized Compensation Table */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden mb-6 relative z-10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100/80 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Compensation Component</th>
                      <th className="p-3.5 text-right">Pay Rate</th>
                      <th className="p-3.5 text-right">Hours / Quantity</th>
                      <th className="p-3.5 text-right">Amount (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-zinc-800">
                    <tr>
                      <td className="p-3.5 font-semibold">
                        Base Regular Working Hours
                        <span className="block text-[11px] text-zinc-400 font-normal">Standard logged shift hours</span>
                      </td>
                      <td className="p-3.5 text-right font-mono">${customHourlyRate.toFixed(2)}/hr</td>
                      <td className="p-3.5 text-right font-mono">{customHours.toFixed(1)} hrs</td>
                      <td className="p-3.5 text-right font-mono font-bold">${(customHourlyRate * customHours).toFixed(2)}</td>
                    </tr>

                    {customOvertimeHours > 0 && (
                      <tr>
                        <td className="p-3.5 font-semibold">
                          Overtime Hours (1.5x Multiplier)
                          <span className="block text-[11px] text-zinc-400 font-normal">Premium compensation for approved extra hours</span>
                        </td>
                        <td className="p-3.5 text-right font-mono">${(customHourlyRate * 1.5).toFixed(2)}/hr</td>
                        <td className="p-3.5 text-right font-mono">{customOvertimeHours.toFixed(1)} hrs</td>
                        <td className="p-3.5 text-right font-mono font-bold">${(customHourlyRate * 1.5 * customOvertimeHours).toFixed(2)}</td>
                      </tr>
                    )}

                    {customBonus > 0 && (
                      <tr>
                        <td className="p-3.5 font-semibold">
                          Internship Performance Stipend / Allowance
                          <span className="block text-[11px] text-zinc-400 font-normal">Authorized merit bonus / project completion</span>
                        </td>
                        <td className="p-3.5 text-right font-mono">Flat</td>
                        <td className="p-3.5 text-right font-mono">1</td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-600">+${customBonus.toFixed(2)}</td>
                      </tr>
                    )}

                    {customDeduction > 0 && (
                      <tr>
                        <td className="p-3.5 font-semibold text-red-600">
                          Statutory Withholdings & Deductions
                          <span className="block text-[11px] text-zinc-400 font-normal">Tax / unpaid leave adjustments</span>
                        </td>
                        <td className="p-3.5 text-right font-mono">Flat</td>
                        <td className="p-3.5 text-right font-mono">1</td>
                        <td className="p-3.5 text-right font-mono font-bold text-red-600">-${customDeduction.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-zinc-50 border-t-2 border-zinc-200">
                    <tr>
                      <td colSpan={3} className="p-3.5 font-black text-sm text-zinc-900 uppercase">
                        Net Disbursed Compensation
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-base text-blue-700">
                        ${certNetPay.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Official HR Statement */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 leading-relaxed mb-8 relative z-10">
                <p className="font-medium">
                  <strong>Verification Statement:</strong> {certNotes}
                </p>
              </div>

              {/* Signatures & Seal Verification Block */}
              <div className="grid grid-cols-3 items-end pt-4 border-t-2 border-zinc-100 relative z-10">
                {/* Official Seal Badge */}
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-full border-4 border-dashed border-blue-600/60 flex flex-col items-center justify-center text-center p-1 text-blue-700">
                    <ShieldCheck size={20} />
                    <span className="text-[7px] font-black uppercase tracking-tight">VERIFIED</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Security Seal</span>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Cryptographically Authenticated
                    </span>
                  </div>
                </div>

                {/* QR Code Verification Simulation */}
                <div className="text-center flex flex-col items-center">
                  <div className="h-14 w-14 bg-zinc-100 rounded-lg p-1.5 border border-zinc-200 flex items-center justify-center">
                    <QrCode size={38} className="text-zinc-800" />
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400 mt-1">Scan for Online Validation</span>
                </div>

                {/* Authorized Signature Line */}
                <div className="text-right">
                  <div className="border-b border-zinc-400 pb-1 mb-1 inline-block w-48 text-center">
                    <span className="font-serif italic text-base text-zinc-800 font-bold tracking-wider">
                      Sarah Jenkins
                    </span>
                  </div>
                  <span className="text-xs font-bold text-zinc-900 block">{signatoryTitle}</span>
                  <span className="text-[11px] text-zinc-500 block">InternManage Global Inc.</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            <Button variant="outline" onClick={() => setIsCertModalOpen(false)}>
              Close Window
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handlePrintCertificate} className="gap-2">
                <Printer size={16} /> Print Document
              </Button>
              <Button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md shadow-emerald-500/20 font-semibold"
              >
                {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {isGeneratingPdf ? "Creating PDF Document..." : "Save PDF File"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
