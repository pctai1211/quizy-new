"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assignmentScheduleSchema } from "@/lib/validations/assignment";
import type { ActionResult } from "@/lib/actions/types";

function revalidateAssignments(quizId: string) {
  revalidatePath(`/admin/quizzes/${quizId}`);
  revalidatePath("/admin/quizzes");
  revalidatePath("/student/dashboard");
}

function parseOptionalDatetime(raw: string): string | null | "invalid" {
  const value = raw.trim();
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "invalid";
  return date.toISOString();
}

function parseSchedule(formData?: FormData) {
  if (!formData) {
    return { available_from: null as string | null, due_at: null as string | null, notes: null as string | null };
  }

  const available_from = parseOptionalDatetime(String(formData.get("available_from") ?? ""));
  const due_at = parseOptionalDatetime(String(formData.get("due_at") ?? ""));
  const notesRaw = String(formData.get("notes") ?? "").trim();

  return {
    available_from,
    due_at,
    notes: notesRaw || null,
  };
}

function validateSchedule(quizId: string, formData?: FormData) {
  const schedule = parseSchedule(formData);
  if (schedule.available_from === "invalid" || schedule.due_at === "invalid") {
    return { success: false as const, error: "Enter a valid date and time" };
  }

  const parsed = assignmentScheduleSchema.safeParse({
    quiz_id: quizId,
    available_from: schedule.available_from,
    due_at: schedule.due_at,
    notes: schedule.notes,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  return { success: true as const, data: parsed.data };
}

async function publishIfDraft(quizId: string) {
  const supabase = await createClient();
  await supabase
    .from("quizzes")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", quizId)
    .eq("status", "draft");
}

export async function assignQuizToClasses(
  quizId: string,
  classIds: string[],
  formData?: FormData
): Promise<ActionResult> {
  const unique = Array.from(new Set(classIds.filter(Boolean)));
  if (unique.length === 0) {
    return { success: false, error: "Select at least one class" };
  }

  const parsed = validateSchedule(quizId, formData);
  if (!parsed.success) return parsed;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = unique.map((class_id) => ({
    quiz_id: quizId,
    class_id,
    assigned_by: user?.id ?? null,
    available_from: parsed.data.available_from ?? null,
    due_at: parsed.data.due_at ?? null,
    notes: parsed.data.notes ?? null,
    status: "assigned" as const,
  }));

  const { error } = await supabase.from("quiz_class_assignments").upsert(rows, {
    onConflict: "quiz_id,class_id",
  });

  if (error) return { success: false, error: error.message };

  await publishIfDraft(quizId);
  revalidateAssignments(quizId);
  return { success: true };
}

export async function assignQuizToStudents(
  quizId: string,
  studentIds: string[],
  formData?: FormData
): Promise<ActionResult> {
  const unique = Array.from(new Set(studentIds.filter(Boolean)));
  if (unique.length === 0) {
    return { success: false, error: "Select at least one student" };
  }

  const parsed = validateSchedule(quizId, formData);
  if (!parsed.success) return parsed;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = unique.map((student_id) => ({
    quiz_id: quizId,
    student_id,
    assigned_by: user?.id ?? null,
    available_from: parsed.data.available_from ?? null,
    due_at: parsed.data.due_at ?? null,
    notes: parsed.data.notes ?? null,
    status: "assigned" as const,
  }));

  const { error } = await supabase.from("quiz_assignments").upsert(rows, {
    onConflict: "quiz_id,student_id",
  });

  if (error) return { success: false, error: error.message };

  await publishIfDraft(quizId);
  revalidateAssignments(quizId);
  return { success: true };
}

export async function removeClassAssignment(
  quizId: string,
  assignmentId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quiz_class_assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("quiz_id", quizId);

  if (error) return { success: false, error: error.message };

  revalidateAssignments(quizId);
  return { success: true };
}

export async function removeStudentAssignment(
  quizId: string,
  assignmentId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quiz_assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("quiz_id", quizId);

  if (error) return { success: false, error: error.message };

  revalidateAssignments(quizId);
  return { success: true };
}
