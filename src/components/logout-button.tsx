"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton({
  className = "",
  showIcon = true,
  children,
}: {
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsPending(true);
    try {
      await signOut({ callbackUrl: "/" });
    } catch {
      router.push("/");
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className={
        className ||
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium transition-colors text-left"
      }
    >
      {showIcon && <LogOut size={18} className={isPending ? "animate-spin" : ""} />}
      <span>{children || (isPending ? "Signing out..." : "Logout")}</span>
    </button>
  );
}
