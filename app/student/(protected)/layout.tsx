import { redirect } from "next/navigation";

import { getCurrentStudent } from "@/lib/students-server";
import { logout } from "@/lib/actions/auth";

export default async function StudentProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  const displayName =
    [student.first_name, student.last_name]
      .filter(Boolean)
      .join(" ") || student.email;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <span className="text-lg font-semibold tracking-tight text-foreground">
          QUIZY
        </span>

        <div className="flex items-center gap-4">
          <span className="truncate text-xs text-muted">
            {displayName}
          </span>

          <form action={logout}>
            <button
              type="submit"
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}