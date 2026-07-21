import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { StudentsTable } from "@/components/admin/students-table";
import type { Student } from "@/lib/types";

export default async function StudentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Students"
        description="Import students from a CSV and manage who can sign in to the student dashboard."
      />
      <StudentsTable students={(data as Student[]) ?? []} />
    </div>
  );
}
