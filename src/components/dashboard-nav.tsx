"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, Clock, CalendarDays, KanbanSquare, Award } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Task Board",
    href: "/dashboard/tasks",
    icon: KanbanSquare,
  },
  {
    name: "Performance & PPO",
    href: "/dashboard/reviews",
    icon: Award,
  },
  {
    name: "Attendance",
    href: "/dashboard/attendance",
    icon: Clock,
  },
  {
    name: "Leave Requests",
    href: "/dashboard/leaves",
    icon: CalendarDays,
  },
  {
    name: "Employees",
    href: "/dashboard/employees",
    icon: Users,
  },
  {
    name: "Payroll",
    href: "/dashboard/payroll",
    icon: CreditCard,
    roles: ["ADMIN", "HR"],
  },
];

export function DashboardNav({ userRole }: { userRole?: string }) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return userRole ? item.roles.includes(userRole) : false;
  });

  return (
    <nav className="flex-1 p-3 flex flex-col gap-1.5 overflow-y-auto">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              isActive
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50"
            }`}
          >
            <Icon
              size={19}
              className={isActive ? "text-white" : "text-zinc-500 dark:text-zinc-400"}
            />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
