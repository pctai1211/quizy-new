"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { studentLoginSchema } from "@/lib/validations/student";
import {
  createStudentSessionCookieValue,
  STUDENT_SESSION_COOKIE,
  STUDENT_SESSION_MAX_AGE_SECONDS,
} from "@/lib/student-session";

export interface StudentLoginResult {
  error?: string;
}

// Passwordless: the student only proves they know an email address that an
// admin has already added to the students table. No code is sent, no
// password is checked — see the security note on app/student/login/page.tsx.
export async function studentLogin(formData: FormData): Promise<StudentLoginResult> {
  const parsed = studentLoginSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = createAdminClient();
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (!student) {
    return { error: "No student record found with that email. Contact your admin." };
  }

  const cookieValue = await createStudentSessionCookieValue(student.id);
  const cookieStore = await cookies();
  cookieStore.set(STUDENT_SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STUDENT_SESSION_MAX_AGE_SECONDS,
  });

  // Only follow same-origin, path-only redirects (e.g. back to the quiz
  // they were opening) — never an absolute/protocol-relative URL.
  const redirectTo = formData.get("redirect_to");
  const isSafeRedirect =
    typeof redirectTo === "string" && redirectTo.startsWith("/") && !redirectTo.startsWith("//");

  redirect(isSafeRedirect ? redirectTo : "/student/dashboard");
}

export async function studentLogout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(STUDENT_SESSION_COOKIE);
  redirect("/student/login");
}
