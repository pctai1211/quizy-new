"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ListChecks, Layers, BarChart3, GraduationCap, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/quizzes", label: "Quizzes", icon: ListChecks },
  { href: "/admin/batches", label: "Batches", icon: Layers },
  { href: "/admin/students", label: "Students", icon: GraduationCap },
  { href: "/admin/results", label: "Results", icon: BarChart3 },
];

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-white md:flex">
      <div className="flex h-16 items-center px-6">
        <span className="text-lg font-semibold tracking-tight text-foreground">QUIZY</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-orange-50 text-primary"
                  : "text-muted hover:bg-gray-50 hover:text-foreground"
              )}
            >
              <link.icon className="h-4 w-4" strokeWidth={1.75} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="mb-2 truncate px-3 text-xs text-muted">{email}</div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-gray-50 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
