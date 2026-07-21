"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { quizSchema, batchSelectionSchema } from "@/lib/validations/quiz";
import type { ActionResult } from "@/lib/actions/batches";

const ACTIVE_WINDOW_MINUTES = 30;

export async function createQuiz(formData: FormData): Promise<ActionResult & { id?: string }> {
  const parsed = quizSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    duration_minutes: formData.get("duration_minutes"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      duration_minutes: parsed.data.duration_minutes,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/quizzes");
  return { success: true, id: data.id };
}

export async function updateQuiz(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = quizSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    duration_minutes: formData.get("duration_minutes"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("quizzes")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      duration_minutes: parsed.data.duration_minutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/quizzes");
  revalidatePath(`/admin/quizzes/${id}`);
  return { success: true };
}

export async function deleteQuiz(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("quizzes").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/quizzes");
  return { success: true };
}

// Publishing selects which batches are allowed to take the quiz at all.
// A batch must be published before it can be activated (see activateQuiz).
export async function publishQuiz(id: string, batchNames: string[]): Promise<ActionResult> {
  const parsed = batchSelectionSchema.safeParse({ batch_names: batchNames });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Select at least one batch" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("quizzes")
    .update({
      published: true,
      published_batches: parsed.data.batch_names,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/quizzes");
  revalidatePath(`/admin/quizzes/${id}`);
  return { success: true };
}

// Unpublishing also ends any live activation window — a quiz can't be
// "active for a batch" while it isn't published at all.
export async function unpublishQuiz(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quizzes")
    .update({
      published: false,
      active_until: null,
      active_batches: [],
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/quizzes");
  revalidatePath(`/admin/quizzes/${id}`);
  return { success: true };
}

// Opens the quiz to the chosen batches for a fixed 30-minute window.
// active_until is just a timestamp — the window "closes" the moment it's
// read as expired (see isQuizLive in lib/utils.ts), no cron needed.
export async function activateQuiz(id: string, batchNames: string[]): Promise<ActionResult> {
  const parsed = batchSelectionSchema.safeParse({ batch_names: batchNames });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Select at least one batch" };
  }

  const supabase = await createClient();
  const { data: quiz, error: fetchError } = await supabase
    .from("quizzes")
    .select("published, published_batches")
    .eq("id", id)
    .single();

  if (fetchError || !quiz) return { success: false, error: "Quiz not found" };
  if (!quiz.published) return { success: false, error: "Publish the quiz before activating it" };

  const allowed = new Set(quiz.published_batches ?? []);
  const invalid = parsed.data.batch_names.filter((name) => !allowed.has(name));
  if (invalid.length > 0) {
    return { success: false, error: `${invalid.join(", ")} must be published to this quiz first` };
  }

  const activeUntil = new Date(Date.now() + ACTIVE_WINDOW_MINUTES * 60_000).toISOString();

  const { error } = await supabase
    .from("quizzes")
    .update({ active_batches: parsed.data.batch_names, active_until: activeUntil })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/quizzes");
  revalidatePath(`/admin/quizzes/${id}`);
  return { success: true };
}

export async function deactivateQuiz(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quizzes")
    .update({ active_until: null, active_batches: [] })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/quizzes");
  revalidatePath(`/admin/quizzes/${id}`);
  return { success: true };
}
