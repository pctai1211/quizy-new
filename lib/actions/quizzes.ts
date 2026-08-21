"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { quizSchema } from "@/lib/validations/quiz";
import type { ActionResult } from "@/lib/actions/types";
import type { QuizStatus } from "@/lib/types";

function revalidateQuiz(id?: string) {
  revalidatePath("/admin/quizzes");
  if (id) revalidatePath(`/admin/quizzes/${id}`);
}

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      duration_minutes: parsed.data.duration_minutes,
      status: "draft",
      is_public: false,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidateQuiz();
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

  revalidateQuiz(id);
  return { success: true };
}

export async function deleteQuiz(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("quizzes").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidateQuiz();
  return { success: true };
}

export async function setQuizStatus(id: string, status: QuizStatus): Promise<ActionResult> {
  if (!["draft", "published", "archived"].includes(status)) {
    return { success: false, error: "Invalid status" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("quizzes")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidateQuiz(id);
  return { success: true };
}

export async function publishQuiz(id: string): Promise<ActionResult> {
  return setQuizStatus(id, "published");
}

export async function unpublishQuiz(id: string): Promise<ActionResult> {
  return setQuizStatus(id, "draft");
}

export async function setQuizPublic(id: string, isPublic: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quizzes")
    .update({
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidateQuiz(id);
  return { success: true };
}
