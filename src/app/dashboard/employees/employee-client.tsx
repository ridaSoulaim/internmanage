"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, Lock, Mail, ShieldAlert } from "lucide-react";
import { createEmployee, updateEmployee, deleteEmployee } from "@/app/actions/employee";

export default function EmployeeClient({ initialEmployees, userRole }: { initialEmployees: any[], userRole: string }) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);

  const canManageEmployees = userRole === "ADMIN" || userRole === "HR";
  const canEditSalary = userRole === "ADMIN";
  const canEditRole = userRole === "ADMIN";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    department: "",
    position: "",
    salary: "",
    hireDate: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
  });

  const filteredEmployees = employees.filter(emp => 
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.user?.email && emp.user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setFormData({
      firstName: "", lastName: "", department: "", position: "", salary: "", hireDate: "", email: "", password: "", role: "EMPLOYEE"
    });
    setCurrentEmployee(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (parseFloat(formData.salary || "0") <= 0) {
      alert("Salary must be strictly positive.");
      setLoading(false);
      return;
    }

    if (new Date(formData.hireDate) > new Date()) {
      alert("Hire date cannot be in the future.");
      setLoading(false);
      return;
    }

    try {
      await createEmployee({
        ...formData,
        salary: parseFloat(formData.salary || "0"),
      });
      setIsAddOpen(false);
      resetForm();
      window.location.reload(); 
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (canEditSalary && parseFloat(formData.salary || "0") <= 0) {
      alert("Salary must be strictly positive.");
      setLoading(false);
      return;
    }

    if (new Date(formData.hireDate) > new Date()) {
      alert("Hire date cannot be in the future.");
      setLoading(false);
      return;
    }

    try {
      await updateEmployee(currentEmployee.id, {
        ...formData,
        salary: parseFloat(formData.salary || "0"),
        // Only send password if it was filled out
        password: formData.password || undefined,
      });
      setIsEditOpen(false);
      resetForm();
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    await deleteEmployee(currentEmployee.id);
    setIsDeleteOpen(false);
    resetForm();
    window.location.reload();
  };

  const openEdit = (emp: any) => {
    setCurrentEmployee(emp);
    setFormData({
      firstName: emp.firstName,
      lastName: emp.lastName,
      department: emp.department,
      position: emp.position,
      salary: emp.salary.toString(),
      hireDate: new Date(emp.hireDate).toISOString().split('T')[0],
      email: emp.user?.email || "",
      password: "", // Never populate the password
      role: emp.user?.role || "EMPLOYEE",
    });
    setIsEditOpen(true);
  };

  const openDelete = (emp: any) => {
    setCurrentEmployee(emp);
    setIsDeleteOpen(true);
  };

  const formatCurrency = (amount: number) => {
    if (!canEditSalary && userRole !== "ADMIN") return "****";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg shadow-zinc-200/40 dark:shadow-none dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl overflow-hidden transition-all duration-200">
        <CardContent className="p-0">
          <header className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50">
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors duration-200" />
              <Input 
                placeholder="Search employees or emails..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-zinc-50/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 rounded-xl focus-visible:ring-blue-500 transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-zinc-900" 
              />
            </div>
            
            {canManageEmployees && (
              <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if(!open) resetForm(); }}>
                <Button 
                  onClick={() => setIsAddOpen(true)}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white gap-2 shadow-sm transition-all duration-200"
                >
                  <Plus size={18} /> Add Employee
                </Button>
                <DialogContent className="sm:max-w-2xl dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl p-0 overflow-hidden">
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                    <DialogHeader>
                      <DialogTitle className="text-xl">Add New Employee</DialogTitle>
                      <DialogDescription>Create a new employee profile and generate their login account.</DialogDescription>
                    </DialogHeader>
                  </div>
                  <form onSubmit={handleAdd} className="space-y-6 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <section className="space-y-4 bg-zinc-50/50 dark:bg-zinc-950/30 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-4 h-px bg-zinc-300 dark:bg-zinc-700"></span>
                          Personal Info
                        </h4>
                        <div className="space-y-1.5">
                          <Label className="text-zinc-600 dark:text-zinc-300">First Name</Label>
                          <Input required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="dark:bg-zinc-950 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-zinc-600 dark:text-zinc-300">Last Name</Label>
                          <Input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="dark:bg-zinc-950 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-zinc-600 dark:text-zinc-300">Hire Date</Label>
                          <Input 
                            type="date" 
                            required 
                            max={new Date().toISOString().split('T')[0]}
                            value={formData.hireDate} 
                            onChange={e => setFormData({...formData, hireDate: e.target.value})} 
                            className="dark:bg-zinc-950 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" 
                          />
                        </div>
                      </section>
                      
                      <section className="space-y-4 bg-zinc-50/50 dark:bg-zinc-950/30 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-4 h-px bg-zinc-300 dark:bg-zinc-700"></span>
                          Work & Account
                        </h4>
                        <div className="space-y-1.5">
                          <Label className="text-zinc-600 dark:text-zinc-300">Department & Position</Label>
                          <div className="flex gap-2">
                            <Input required placeholder="Dept" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="dark:bg-zinc-950 w-1/2 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" />
                            <Input required placeholder="Title" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="dark:bg-zinc-950 w-1/2 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" />
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                            Salary ($) {!canEditSalary && <Lock size={12} className="text-zinc-400" />}
                          </Label>
                          <Input 
                            type="number" 
                            required
                            min="0.01"
                            step="0.01"
                            disabled={!canEditSalary} 
                            value={formData.salary} 
                            onChange={e => setFormData({...formData, salary: e.target.value})} 
                            className="dark:bg-zinc-950 rounded-lg h-10 transition-colors focus-visible:ring-blue-500 disabled:opacity-50" 
                            placeholder={!canEditSalary ? "Admin only" : ""}
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-zinc-600 dark:text-zinc-300">Login Email (Optional)</Label>
                          <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="dark:bg-zinc-950 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" />
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-zinc-600 dark:text-zinc-300">Login Password (Optional)</Label>
                          <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="dark:bg-zinc-950 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" placeholder="Required if email is set" />
                        </div>

                        {canEditRole && (
                          <div className="space-y-1.5">
                            <Label className="text-zinc-600 dark:text-zinc-300">System Role</Label>
                            <select 
                              className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950 transition-colors focus-visible:ring-blue-500 focus-visible:outline-none"
                              value={formData.role}
                              onChange={e => setFormData({...formData, role: e.target.value})}
                            >
                              <option value="EMPLOYEE">Standard Employee</option>
                              <option value="HR">HR Manager</option>
                              <option value="ADMIN">Administrator</option>
                            </select>
                          </div>
                        )}
                      </section>
                    </div>
                    
                    <DialogFooter className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                      <Button type="button" variant="outline" className="rounded-xl h-10 px-6" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 rounded-xl h-10 px-6 transition-all active:scale-95">
                        {loading ? "Saving..." : "Save Employee"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </header>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-950/50">
              <TableRow className="border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                <TableHead>Employee</TableHead>
                <TableHead>Email & Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                {canManageEmployees && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManageEmployees ? 7 : 6} className="h-32 text-center text-zinc-500">
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow key={emp.id} className="border-zinc-200 dark:border-zinc-800">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-50">{emp.firstName} {emp.lastName}</div>
                          <div className="text-xs text-zinc-500">{emp.id.substring(0, 8)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {emp.user?.email ? (
                        <div>
                          <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                            <Mail size={12} /> {emp.user.email}
                          </div>
                          <div className="mt-1">
                            {emp.user.role === "ADMIN" && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">ADMIN</span>}
                            {emp.user.role === "HR" && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">HR</span>}
                            {emp.user.role === "EMPLOYEE" && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">EMPLOYEE</span>}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">No account</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                        {emp.department}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400">{emp.position}</TableCell>
                    <TableCell className="text-zinc-600 dark:text-zinc-400">{new Date(emp.hireDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-medium text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(emp.salary)}
                    </TableCell>
                    {canManageEmployees && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-blue-600" onClick={() => openEdit(emp)}>
                            <Pencil size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-600" onClick={() => openDelete(emp)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Edit Dialog */}
      {canManageEmployees && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-2xl dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl p-0 overflow-hidden">
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-xl">Edit Employee</DialogTitle>
                <DialogDescription>Make changes to the employee&apos;s profile and account.</DialogDescription>
              </DialogHeader>
            </div>
            <form onSubmit={handleEdit} className="space-y-6 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="space-y-4 bg-zinc-50/50 dark:bg-zinc-950/30 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-4 h-px bg-zinc-300 dark:bg-zinc-700"></span>
                    Personal Info
                  </h4>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-600 dark:text-zinc-300">First Name</Label>
                    <Input required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="dark:bg-zinc-950 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-600 dark:text-zinc-300">Last Name</Label>
                    <Input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="dark:bg-zinc-950 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-600 dark:text-zinc-300">Hire Date</Label>
                    <Input 
                      type="date" 
                      required 
                      max={new Date().toISOString().split('T')[0]}
                      value={formData.hireDate} 
                      onChange={e => setFormData({...formData, hireDate: e.target.value})} 
                      className="dark:bg-zinc-950 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" 
                    />
                  </div>
                </section>
                
                <section className="space-y-4 bg-zinc-50/50 dark:bg-zinc-950/30 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-4 h-px bg-zinc-300 dark:bg-zinc-700"></span>
                    Work & Account
                  </h4>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-600 dark:text-zinc-300">Department & Position</Label>
                    <div className="flex gap-2">
                      <Input required placeholder="Dept" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="dark:bg-zinc-950 w-1/2 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" />
                      <Input required placeholder="Title" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="dark:bg-zinc-950 w-1/2 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                      Salary ($) {!canEditSalary && <Lock size={12} className="text-zinc-400" />}
                    </Label>
                    <Input 
                      type="number" 
                      required
                      min="0.01"
                      step="0.01"
                      disabled={!canEditSalary} 
                      value={formData.salary} 
                      onChange={e => setFormData({...formData, salary: e.target.value})} 
                      className="dark:bg-zinc-950 rounded-lg h-10 transition-colors focus-visible:ring-blue-500 disabled:opacity-50" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-zinc-600 dark:text-zinc-300">Login Email</Label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="dark:bg-zinc-950 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-zinc-600 dark:text-zinc-300">New Password (Optional)</Label>
                    <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="dark:bg-zinc-950 rounded-lg h-10 transition-colors focus-visible:ring-blue-500" placeholder="Leave blank to keep current" />
                  </div>

                  {canEditRole && (
                    <div className="space-y-1.5">
                      <Label className="text-zinc-600 dark:text-zinc-300">System Role</Label>
                      <select 
                        className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950 transition-colors focus-visible:ring-blue-500 focus-visible:outline-none"
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value})}
                      >
                        <option value="EMPLOYEE">Standard Employee</option>
                        <option value="HR">HR Manager</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </div>
                  )}
                </section>
              </div>
              
              <DialogFooter className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <Button type="button" variant="outline" className="rounded-xl h-10 px-6" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 rounded-xl h-10 px-6 transition-all active:scale-95">
                  {loading ? "Updating..." : "Update Employee"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      {canManageEmployees && (
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-[425px] dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <ShieldAlert size={20} /> Delete Employee
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{currentEmployee?.firstName} {currentEmployee?.lastName}</strong>? 
                {currentEmployee?.user && " This will also PERMANENTLY DELETE their login account and revoke system access."}
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                {loading ? "Deleting..." : "Delete Permanently"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </Card>
    </div>
  );
}
