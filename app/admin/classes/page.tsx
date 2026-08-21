import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { ClassesTable } from "@/components/admin/classes-table";
import type { Class } from "@/lib/types";

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Classes"
        description="Organize students into classes. One student can belong to many classes."
      />
      <ClassesTable classes={(data as Class[]) ?? []} />
    </div>
  );
}
