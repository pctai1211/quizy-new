"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/batches";

export interface QuestionFormPayload {
  quiz_id: string;
  question_text: string;
  question_type: "single_choice" | "multiple_choice" | "short_answer" | "open_ended";
  points: number;
  sort_order: number;
  options: string[];
  correct_option_index: number | null;
  correct_option_indices: number[];
  correct_answer: string;
}

export async function createQuestion(payload: QuestionFormPayload): Promise<ActionResult> {
  const supabase = await createClient();

  const correctAnswers = payload.question_type === "multiple_choice"
    ? payload.correct_option_indices.map((index) => payload.options[index]).filter((answer): answer is string => Boolean(answer))
    : [];
  const correctAnswer =
  payload.question_type === "single_choice"
    ? payload.options[payload.correct_option_index ?? 0] ?? ""
    : payload.question_type === "multiple_choice"
    ? ""
    : payload.correct_answer;

  const { data: question, error } = await supabase
    .from("questions")
    .insert({
      quiz_id: payload.quiz_id,
      question_text: payload.question_text,
      question_type: payload.question_type,
      correct_answer: correctAnswer,
      correct_answers: correctAnswers,
      points: payload.points,
      sort_order: payload.sort_order,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  if ((payload.question_type === "single_choice" || payload.question_type === "multiple_choice") && payload.options.length > 0) {
    const rows = payload.options.map((text, index) => ({
      question_id: question.id,
      option_text: text,
      sort_order: index,
    }));
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
  const supabase = await createClient();

  const correctAnswers = payload.question_type === "multiple_choice"
    ? payload.correct_option_indices.map((index) => payload.options[index]).filter((answer): answer is string => Boolean(answer))
    : [];
  const correctAnswer =
  payload.question_type === "single_choice"
    ? payload.options[payload.correct_option_index ?? 0] ?? ""
    : payload.question_type === "multiple_choice"
    ? ""
    : payload.correct_answer;

  const { error } = await supabase
    .from("questions")
    .update({
      question_text: payload.question_text,
      question_type: payload.question_type,
      correct_answer: correctAnswer,
      correct_answers: correctAnswers,
      points: payload.points,
    })
    .eq("id", questionId);

  if (error) return { success: false, error: error.message };

  // Replace options wholesale for simplicity and correctness.
  await supabase.from("question_options").delete().eq("question_id", questionId);

  if ((payload.question_type === "single_choice" || payload.question_type === "multiple_choice") && payload.options.length > 0) {
    const rows = payload.options.map((text, index) => ({
      question_id: questionId,
      option_text: text,
      sort_order: index,
    }));
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
