"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { batchSchema } from "@/lib/validations/batch";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function createBatch(formData: FormData): Promise<ActionResult> {
  const parsed = batchSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("batches").insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
    active: parsed.data.active,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/batches");
  return { success: true };
}

export async function updateBatch(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = batchSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("batches")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      active: parsed.data.active,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/batches");
  return { success: true };
}

export async function deleteBatch(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("batches").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/batches");
  return { success: true };
}
