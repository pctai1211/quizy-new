"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  studentSchema,
  studentImportRowSchema,
  type StudentImportRow,
} from "@/lib/validations/student";
import { ensureClassesExist, setStudentClasses } from "@/lib/actions/classes";
import type { ActionResult } from "@/lib/actions/types";

function revalidateStudentPaths() {
  revalidatePath("/admin/students");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/batches");
}

function splitFullName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0]!, last_name: parts[0]! };
  return {
    first_name: parts[0]!,
    last_name: parts.slice(1).join(" "),
  };
}

function parseClassNames(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function randomPassword(): string {
  return `Qy-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function parseClassIds(formData: FormData): string[] {
  return formData
    .getAll("class_ids")
    .map(String)
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function createStudent(formData: FormData): Promise<ActionResult> {
  const parsed = studentSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    password: formData.get("password") || undefined,
    student_code: formData.get("student_code") || "",
    phone: formData.get("phone") || "",
    active: formData.get("active") !== "off",
    class_ids: parseClassIds(formData),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!parsed.data.password) {
    return { success: false, error: "Password is required for new students" };
  }

  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
    },
  });

  if (authError || !created.user) {
    if (authError?.message?.toLowerCase().includes("already")) {
      return { success: false, error: "A user with this email already exists" };
    }
    return { success: false, error: authError?.message ?? "Failed to create auth user" };
  }

  const userId = created.user.id;

  // Trigger creates profiles + students; patch remaining fields.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      email: parsed.data.email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  const { error: studentError } = await supabase
    .from("students")
    .update({
      student_code: parsed.data.student_code || null,
      phone: parsed.data.phone || null,
      active: parsed.data.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (studentError) {
    return { success: false, error: studentError.message };
  }

  try {
    await setStudentClasses(supabase, userId, parsed.data.class_ids);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to enroll in classes",
    };
  }

  revalidateStudentPaths();
  return { success: true };
}

export async function updateStudent(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = studentSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    password: formData.get("password") || "",
    student_code: formData.get("student_code") || "",
    phone: formData.get("phone") || "",
    active: formData.get("active") !== "off",
    class_ids: parseClassIds(formData),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      email: parsed.data.email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (profileError) return { success: false, error: profileError.message };

  const { error: studentError } = await supabase
    .from("students")
    .update({
      student_code: parsed.data.student_code || null,
      phone: parsed.data.phone || null,
      active: parsed.data.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (studentError) return { success: false, error: studentError.message };

  // Keep Auth email in sync; optionally reset password when provided.
  const authUpdate: { email?: string; password?: string; user_metadata?: Record<string, string> } = {
    email: parsed.data.email,
    user_metadata: {
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
    },
  };
  if (parsed.data.password) {
    authUpdate.password = parsed.data.password;
  }

  const { error: authError } = await admin.auth.admin.updateUserById(id, authUpdate);
  if (authError) {
    return { success: false, error: authError.message };
  }

  try {
    await setStudentClasses(supabase, id, parsed.data.class_ids);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update class membership",
    };
  }

  revalidateStudentPaths();
  return { success: true };
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) return { success: false, error: error.message };

  revalidateStudentPaths();
  return { success: true };
}

export interface ImportRow {
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  password?: string;
  student_code?: string;
  phone?: string;
  classes?: string;
  /** @deprecated legacy CSV column */
  batch_name?: string;
}

export interface ImportResult {
  success: boolean;
  error?: string;
  imported: number;
  skipped: { row: ImportRow; reason: string }[];
}

export async function importStudents(rows: ImportRow[]): Promise<ImportResult> {
  if (rows.length === 0) {
    return { success: false, error: "No rows to import", imported: 0, skipped: [] };
  }
  if (rows.length > 2000) {
    return { success: false, error: "CSV has too many rows (max 2000)", imported: 0, skipped: [] };
  }

  const skipped: { row: ImportRow; reason: string }[] = [];
  const byEmail = new Map<string, StudentImportRow & { classNames: string[] }>();

  for (const row of rows) {
    let first_name = row.first_name?.trim() ?? "";
    let last_name = row.last_name?.trim() ?? "";

    if ((!first_name || !last_name) && row.name?.trim()) {
      const split = splitFullName(row.name);
      first_name = first_name || split.first_name;
      last_name = last_name || split.last_name;
    }

    const classSource = row.classes || row.batch_name || "";
    const parsed = studentImportRowSchema.safeParse({
      first_name,
      last_name,
      email: row.email,
      password: row.password || "",
      student_code: row.student_code || "",
      phone: row.phone || "",
      classes: classSource,
    });

    if (!parsed.success) {
      skipped.push({ row, reason: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }

    byEmail.set(parsed.data.email.toLowerCase(), {
      ...parsed.data,
      classNames: parseClassNames(parsed.data.classes),
    });
  }

  const valid = Array.from(byEmail.values());
  if (valid.length === 0) {
    return { success: false, error: "No valid rows found", imported: 0, skipped };
  }

  const admin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  let imported = 0;

  for (const row of valid) {
    try {
      const classRows = await ensureClassesExist(supabase, row.classNames, actor?.id ?? null);
      const classIds = classRows.map((c) => c.id);

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", row.email)
        .maybeSingle();

      let studentId = existingProfile?.id;

      if (!studentId) {
        const { data: created, error: authError } = await admin.auth.admin.createUser({
          email: row.email,
          password: row.password || randomPassword(),
          email_confirm: true,
          user_metadata: {
            first_name: row.first_name,
            last_name: row.last_name,
          },
        });

        if (authError || !created.user) {
          skipped.push({
            row: { email: row.email, first_name: row.first_name, last_name: row.last_name },
            reason: authError?.message ?? "Failed to create user",
          });
          continue;
        }
        studentId = created.user.id;
      } else if (row.password) {
        await admin.auth.admin.updateUserById(studentId, { password: row.password });
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId);

      if (profileError) {
        skipped.push({
          row: { email: row.email, first_name: row.first_name, last_name: row.last_name },
          reason: profileError.message,
        });
        continue;
      }

      const { error: studentError } = await supabase
        .from("students")
        .update({
          student_code: row.student_code || null,
          phone: row.phone || null,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId);

      if (studentError) {
        skipped.push({
          row: { email: row.email, first_name: row.first_name, last_name: row.last_name },
          reason: studentError.message,
        });
        continue;
      }

      await setStudentClasses(supabase, studentId, classIds);
      imported += 1;
    } catch (err) {
      skipped.push({
        row: { email: row.email, first_name: row.first_name, last_name: row.last_name },
        reason: err instanceof Error ? err.message : "Import failed",
      });
    }
  }

  revalidateStudentPaths();
  return {
    success: imported > 0,
    imported,
    skipped,
    error: imported === 0 ? "No students were imported" : undefined,
  };
}
