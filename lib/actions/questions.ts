"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { questionSchema } from "@/lib/validations/question";
import type { ActionResult } from "@/lib/actions/types";
import type { QuestionType } from "@/lib/types";

export interface QuestionFormPayload {
  quiz_id: string;
  question: string;
  type: QuestionType;
  points: number;
  sort_order: number;
  explanation?: string | null;
  options: Array<{ option_text: string; is_correct: boolean }>;
  correct_answer?: string;
}

function optionRows(
  questionId: string,
  payload: QuestionFormPayload
): Array<{
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}> {
  if (payload.type === "single_choice" || payload.type === "multiple_choice") {
    return payload.options.map((option, index) => ({
      question_id: questionId,
      option_text: option.option_text.trim(),
      is_correct: option.is_correct,
      sort_order: index,
    }));
  }

  if (payload.type === "short_answer" && payload.correct_answer?.trim()) {
    return [
      {
        question_id: questionId,
        option_text: payload.correct_answer.trim(),
        is_correct: true,
        sort_order: 0,
      },
    ];
  }

  return [];
}

function parsePayload(payload: QuestionFormPayload) {
  return questionSchema.safeParse({
    question: payload.question,
    type: payload.type,
    points: payload.points,
    explanation: payload.explanation ?? "",
    options: payload.options,
    correct_answer: payload.correct_answer,
  });
}

export async function createQuestion(payload: QuestionFormPayload): Promise<ActionResult> {
  const parsed = parsePayload(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid question" };
  }

  const supabase = await createClient();

  const { data: question, error } = await supabase
    .from("questions")
    .insert({
      quiz_id: payload.quiz_id,
      question: parsed.data.question,
      type: parsed.data.type,
      points: parsed.data.points,
      sort_order: payload.sort_order,
      explanation: parsed.data.explanation || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  const rows = optionRows(question.id, {
    ...payload,
    question: parsed.data.question,
    type: parsed.data.type,
    points: parsed.data.points,
    explanation: parsed.data.explanation || null,
    correct_answer: parsed.data.correct_answer,
  });

  if (rows.length > 0) {
    const { error: optionError } = await supabase.from("question_options").insert(rows);
    if (optionError) return { success: false, error: optionError.message };
  }

  revalidatePath(`/admin/quizzes/${payload.quiz_id}`);
  return { success: true };
}

export async function updateQuestion(
  questionId: string,
  payload: QuestionFormPayload
): Promise<ActionResult> {
  const parsed = parsePayload(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid question" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("questions")
    .update({
      question: parsed.data.question,
      type: parsed.data.type,
      points: parsed.data.points,
      explanation: parsed.data.explanation || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", questionId);

  if (error) return { success: false, error: error.message };

  await supabase.from("question_options").delete().eq("question_id", questionId);

  const rows = optionRows(questionId, {
    ...payload,
    question: parsed.data.question,
    type: parsed.data.type,
    points: parsed.data.points,
    explanation: parsed.data.explanation || null,
    correct_answer: parsed.data.correct_answer,
  });

  if (rows.length > 0) {
    const { error: optionError } = await supabase.from("question_options").insert(rows);
    if (optionError) return { success: false, error: optionError.message };
  }

  revalidatePath(`/admin/quizzes/${payload.quiz_id}`);
  return { success: true };
}

export async function deleteQuestion(questionId: string, quizId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("questions").delete().eq("id", questionId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/quizzes/${quizId}`);
  return { success: true };
}

export async function reorderQuestions(
  quizId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const updates = orderedIds.map((id, index) =>
    supabase.from("questions").update({ sort_order: index }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { success: false, error: failed.error.message };

  revalidatePath(`/admin/quizzes/${quizId}`);
  return { success: true };
}
