import { createClient } from "@/lib/supabase/server";
import type { StudentWithProfile } from "@/lib/types";

export async function getCurrentStudent(): Promise<StudentWithProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      first_name,
      last_name,
      role
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "student") {
    return null;
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(`
      id,
      student_code,
      phone,
      active,
      created_at,
      updated_at
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (studentError || !student || !student.active) {
    return null;
  }

  const { data: memberships } = await supabase
    .from("class_students")
    .select(`
      class_id,
      classes (
        id,
        name,
        active
      )
    `)
    .eq("student_id", user.id);

  const classes = (memberships ?? [])
    .flatMap((row) => {
      const raw = row.classes as
        | { id: string; name: string; active: boolean }
        | { id: string; name: string; active: boolean }[]
        | null;
      if (!raw) return [];
      return Array.isArray(raw) ? raw : [raw];
    })
    .filter((cls) => Boolean(cls?.id));

  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Student";

  return {
    ...student,
    name: fullName,
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    classes,
    class_ids: classes.map((c) => c.id),
    batch_name: classes.map((c) => c.name).join(", "),
  };
}
