"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { studentSchema } from "@/lib/validations/student";
import type { ActionResult } from "@/lib/actions/batches";
import type { SupabaseClient } from "@supabase/supabase-js";

// Batches are a separate admin-managed entity (used for quiz publish/activate
// targeting), but students can name a batch that doesn't exist there yet —
// via CSV import or manual add. Backfill it so it shows up in Admin > Batches
// instead of only existing as a string on student rows.
async function ensureBatchesExist(supabase: SupabaseClient, batchNames: string[]): Promise<void> {
  const distinct = Array.from(new Set(batchNames.map((name) => name.trim()).filter(Boolean)));
  if (distinct.length === 0) return;

  const { data: existing } = await supabase.from("batches").select("name");
  const existingNames = new Set((existing ?? []).map((b) => b.name));
  const missing = distinct.filter((name) => !existingNames.has(name));
  if (missing.length === 0) return;

  await supabase.from("batches").insert(missing.map((name) => ({ name, active: true })));
}

export async function createStudent(formData: FormData): Promise<ActionResult> {
  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    batch_name: formData.get("batch_name"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("students").insert(parsed.data);

  if (error) {
    if (error.code === "23505") return { success: false, error: "A student with this email already exists" };
    return { success: false, error: error.message };
  }

  await ensureBatchesExist(supabase, [parsed.data.batch_name]);

  revalidatePath("/admin/students");
  revalidatePath("/admin/batches");
  return { success: true };
}

export async function updateStudent(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = studentSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    batch_name: formData.get("batch_name"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("students").update(parsed.data).eq("id", id);

  if (error) {
    if (error.code === "23505") return { success: false, error: "A student with this email already exists" };
    return { success: false, error: error.message };
  }

  await ensureBatchesExist(supabase, [parsed.data.batch_name]);

  revalidatePath("/admin/students");
  revalidatePath("/admin/batches");
  return { success: true };
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("students").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/students");
  return { success: true };
}

export interface ImportRow {
  name: string;
  email: string;
  batch_name: string;
}

export interface ImportResult {
  success: boolean;
  error?: string;
  imported: number;
  skipped: { row: ImportRow; reason: string }[];
}

// Validates every row, dedupes by email within the file (last one wins),
// then upserts on email so re-importing an updated CSV fixes existing
// students instead of erroring on the unique constraint.
export async function importStudents(rows: ImportRow[]): Promise<ImportResult> {
  if (rows.length === 0) {
    return { success: false, error: "No rows to import", imported: 0, skipped: [] };
  }
  if (rows.length > 2000) {
    return { success: false, error: "CSV has too many rows (max 2000)", imported: 0, skipped: [] };
  }

  const skipped: { row: ImportRow; reason: string }[] = [];
  const byEmail = new Map<string, StudentInsert>();

  for (const row of rows) {
    const parsed = studentSchema.safeParse(row);
    if (!parsed.success) {
      skipped.push({ row, reason: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }
    byEmail.set(parsed.data.email, parsed.data);
  }

  const valid = Array.from(byEmail.values());
  if (valid.length === 0) {
    return { success: false, error: "No valid rows found", imported: 0, skipped };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("students").upsert(valid, { onConflict: "email" });

  if (error) {
    return { success: false, error: error.message, imported: 0, skipped };
  }

  await ensureBatchesExist(supabase, valid.map((row) => row.batch_name));

  revalidatePath("/admin/students");
  revalidatePath("/admin/batches");
  return { success: true, imported: valid.length, skipped };
}

type StudentInsert = { name: string; email: string; batch_name: string };
