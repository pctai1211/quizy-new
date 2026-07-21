"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ListChecks, Layers, BarChart3, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/quizzes", label: "Quizzes", icon: ListChecks },
  { href: "/admin/batches", label: "Batches", icon: Layers },
  { href: "/admin/students", label: "Students", icon: GraduationCap },
  { href: "/admin/results", label: "Results", icon: BarChart3 },
];

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-30 flex flex-col border-b border-border bg-white md:hidden">
      <div className="flex h-14 items-center px-4">
        <span className="text-base font-semibold tracking-tight text-foreground">QUIZY</span>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium",
                active ? "bg-orange-50 text-primary" : "text-muted"
              )}
            >
              <link.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
