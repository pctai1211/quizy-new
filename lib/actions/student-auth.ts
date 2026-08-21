"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { studentLoginSchema } from "@/lib/validations/student";

export interface StudentLoginResult {
  error?: string;
}

export async function studentLogin(
  formData: FormData
): Promise<StudentLoginResult> {
  const parsed = studentLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return {
      error: "Invalid email or password",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profile?.role !== "student") {
    await supabase.auth.signOut();

    return {
      error: "This account is not a student account.",
    };
  }

  const redirectTo = formData.get("redirect_to");

  const isSafeRedirect =
    typeof redirectTo === "string" &&
    redirectTo.startsWith("/") &&
    !redirectTo.startsWith("//");

  redirect(
    isSafeRedirect
      ? redirectTo
      : "/student/dashboard"
  );
}

export async function studentLogout(): Promise<void> {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/student/login");
}