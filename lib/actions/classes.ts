"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { classSchema } from "@/lib/validations/class";
import type { ActionResult } from "@/lib/actions/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function revalidateClassPaths() {
  revalidatePath("/admin/classes");
  revalidatePath("/admin/batches");
  revalidatePath("/admin/students");
}

export async function createClass(formData: FormData): Promise<ActionResult> {
  const parsed = classSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("classes").insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
    active: parsed.data.active,
    created_by: user?.id ?? null,
  });

  if (error) return { success: false, error: error.message };

  revalidateClassPaths();
  return { success: true };
}

export async function updateClass(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = classSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      active: parsed.data.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidateClassPaths();
  return { success: true };
}

export async function deleteClass(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("classes").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidateClassPaths();
  return { success: true };
}

/** Resolve class names to IDs, creating missing classes when needed. */
export async function ensureClassesExist(
  supabase: SupabaseClient,
  classNames: string[],
  createdBy?: string | null
): Promise<{ id: string; name: string }[]> {
  const distinct = Array.from(
    new Set(classNames.map((name) => name.trim()).filter(Boolean))
  );
  if (distinct.length === 0) return [];

  const { data: existing, error: listError } = await supabase
    .from("classes")
    .select("id, name")
    .in("name", distinct);

  if (listError) throw new Error(listError.message);

  const byName = new Map((existing ?? []).map((row) => [row.name, row]));
  const missing = distinct.filter((name) => !byName.has(name));

  if (missing.length > 0) {
    const { data: created, error: insertError } = await supabase
      .from("classes")
      .insert(
        missing.map((name) => ({
          name,
          active: true,
          created_by: createdBy ?? null,
        }))
      )
      .select("id, name");

    if (insertError) throw new Error(insertError.message);
    for (const row of created ?? []) byName.set(row.name, row);
  }

  return distinct.map((name) => byName.get(name)!).filter(Boolean);
}

export async function setStudentClasses(
  supabase: SupabaseClient,
  studentId: string,
  classIds: string[]
): Promise<void> {
  const uniqueIds = Array.from(new Set(classIds.filter(Boolean)));

  const { error: deleteError } = await supabase
    .from("class_students")
    .delete()
    .eq("student_id", studentId);

  if (deleteError) throw new Error(deleteError.message);

  if (uniqueIds.length === 0) return;

  const { error: insertError } = await supabase.from("class_students").insert(
    uniqueIds.map((class_id) => ({
      class_id,
      student_id: studentId,
    }))
  );

  if (insertError) throw new Error(insertError.message);
}
