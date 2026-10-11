import { Users, Search } from "lucide-react";
import { DashboardNav } from "@/components/dashboard-nav";
import { UserNav } from "@/components/user-nav";
import { LogoutButton } from "@/components/logout-button";
import { Input } from "@/components/ui/input";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const email = session?.user?.email || "";
  const role = session?.user?.role || "EMPLOYEE";
  const initials = email ? email.substring(0, 2).toUpperCase() : "U";

  let fullName = "System User";
  if (session?.user?.id) {
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id }
    });
    if (employee) {
      fullName = `${employee.firstName} ${employee.lastName}`;
    } else if (role === "ADMIN") {
      fullName = "Administrator";
    }
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex flex-col h-screen sticky top-0">
        <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 font-bold text-lg text-zinc-900 dark:text-zinc-50">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Users size={18} />
            </div>
            <span className="tracking-tight">InternManage</span>
          </div>
        </div>
        
        <DashboardNav userRole={role} />

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
          <div className="relative w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input 
              type="search" 
              placeholder="Search employees, departments..." 
              className="w-full pl-9 bg-zinc-50 dark:bg-zinc-950 border-0 focus-visible:ring-1 focus-visible:ring-blue-500" 
            />
          </div>
          
          <div className="flex items-center gap-4">
            <UserNav 
              initials={initials} 
              fullName={fullName} 
              email={email} 
              role={role} 
            />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
