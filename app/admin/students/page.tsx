import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { StudentsTable } from "@/components/admin/students-table";
import { mapStudentRow, type StudentQueryRow } from "@/lib/mappers/student";
import type { Class } from "@/lib/types";

export default async function StudentsPage() {
  const supabase = await createClient();

  const [{ data: studentRows }, { data: classRows }] = await Promise.all([
    supabase
      .from("students")
      .select(
        `
        id,
        student_code,
        phone,
        active,
        created_at,
        updated_at,
        profiles (
          email,
          first_name,
          last_name
        ),
        class_students (
          class_id,
          classes (
            id,
            name,
            active
          )
        )
      `
      )
      .order("created_at", { ascending: false }),
    supabase.from("classes").select("*").order("name", { ascending: true }),
  ]);

  const students = ((studentRows as StudentQueryRow[] | null) ?? []).map(mapStudentRow);

  return (
    <div>
      <PageHeader
        title="Students"
        description="Create login accounts and enroll each student in one or more classes."
      />
      <StudentsTable students={students} classes={(classRows as Class[]) ?? []} />
    </div>
  );
}
