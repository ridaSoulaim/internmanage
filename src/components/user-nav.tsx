"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAccount } from "@/app/actions/auth";

export function UserNav({ 
  initials, 
  fullName, 
  email, 
  role 
}: { 
  initials: string,
  fullName: string,
  email: string,
  role: string
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [formEmail, setFormEmail] = useState(email);
  const [formPassword, setFormPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateAccount(formEmail, formPassword || undefined);
      alert("Account updated successfully!");
      setIsOpen(false);
      setFormPassword("");
      // Force reload to get updated session info if email changed
      if (formEmail !== email) {
        window.location.reload();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div 
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-900 cursor-pointer select-none"
      >
        {initials}
      </div>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-zinc-900 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden border border-zinc-200 dark:border-zinc-800">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{fullName}</p>
            <p className="text-xs text-zinc-500 truncate">{email}</p>
            <div className="mt-1">
              {role === "ADMIN" && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">ADMIN</span>}
              {role === "HR" && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">HR</span>}
              {role === "EMPLOYEE" && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">EMPLOYEE</span>}
            </div>
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                setIsOpen(true);
              }}
              className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Account Settings
            </button>
            <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                import("next-auth/react").then(({ signOut }) => signOut({ callbackUrl: "/" }));
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* When clicking outside, close dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle>Account Profile</DialogTitle>
            <DialogDescription>
              View your profile and update your login credentials.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-4">
              
              <div className="space-y-2">
                <Label>Full Name (Read Only)</Label>
                <Input 
                  disabled 
                  value={fullName}
                  className="bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400" 
                />
              </div>

              <div className="space-y-2">
                <Label>System Role (Read Only)</Label>
                <Input 
                  disabled 
                  value={role}
                  className="bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400" 
                />
              </div>

              <div className="space-y-2">
                <Label>Login Email</Label>
                <Input 
                  type="email" 
                  required 
                  value={formEmail} 
                  onChange={e => setFormEmail(e.target.value)} 
                  className="dark:bg-zinc-950" 
                />
              </div>

              <div className="space-y-2">
                <Label>New Password</Label>
                <Input 
                  type="password" 
                  minLength={6}
                  placeholder="Leave blank to keep current password"
                  value={formPassword} 
                  onChange={e => setFormPassword(e.target.value)} 
                  className="dark:bg-zinc-950" 
                />
              </div>

            </div>
            <DialogFooter className="pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
