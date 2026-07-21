import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { STUDENT_SESSION_COOKIE, verifyStudentSessionCookieValue } from "@/lib/student-session";
import type { Student } from "@/lib/types";

// Reads the signed student cookie and loads the matching row. Bypasses RLS
// deliberately — students never hold a Supabase Auth session, so there's no
// "authenticated" context for RLS to key off of (see 0005_students.sql).
export async function getCurrentStudent(): Promise<Student | null> {
  const cookieStore = await cookies();
  const studentId = await verifyStudentSessionCookieValue(
    cookieStore.get(STUDENT_SESSION_COOKIE)?.value
  );
  if (!studentId) return null;

  const supabase = createAdminClient();
  const { data } = await supabase.from("students").select("*").eq("id", studentId).single();
  return (data as Student) ?? null;
}
