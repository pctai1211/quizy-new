import type { Class, Student } from "@/lib/types";

export type StudentQueryRow = {
  id: string;
  student_code: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  profiles: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  class_students: Array<{
    class_id?: string;
    classes: { id: string; name: string; active: boolean } | null;
  }> | null;
};

export function mapStudentRow(row: StudentQueryRow): Student {
  const profile = row.profiles;
  const classes = (row.class_students ?? [])
    .map((m) => m.classes)
    .filter((c): c is Pick<Class, "id" | "name" | "active"> => Boolean(c));
  const first_name = profile?.first_name ?? null;
  const last_name = profile?.last_name ?? null;
  const name = [first_name, last_name].filter(Boolean).join(" ") || "Student";

  return {
    id: row.id,
    student_code: row.student_code,
    phone: row.phone,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    email: profile?.email ?? "",
    first_name,
    last_name,
    name,
    classes,
    class_ids: classes.map((c) => c.id),
  };
}
