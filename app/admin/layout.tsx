import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminMobileNav } from "@/components/admin/mobile-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/student/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-white">
      <AdminSidebar email={user.email ?? ""} />

      <div className="flex min-w-0 flex-1 flex-col max-h-[100vh] overflow-y-auto">
        <AdminMobileNav />

        <main className="flex-1 px-4 py-8 sm:px-8 md:px-10 md:py-10">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}