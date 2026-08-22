import type { QuizAnswerState } from "@/lib/types";

export type DraftAnswerInput = {
  question_id: string;
  answer: string | string[];
};

export type AttemptAnswerDraft = {
  question_id: string;
  selected_option_ids: string[] | null;
  text_answer: string | null;
};

export function answersToState(
  rows: Array<{
    question_id: string;
    selected_option_ids: unknown;
    text_answer: string | null;
  }>
): QuizAnswerState {
  const state: QuizAnswerState = {};
  for (const row of rows) {
    const optionIds = Array.isArray(row.selected_option_ids)
      ? row.selected_option_ids.filter((id): id is string => typeof id === "string")
      : [];
    if (optionIds.length > 1) {
      state[row.question_id] = optionIds;
    } else if (optionIds.length === 1) {
      state[row.question_id] = optionIds[0] as string;
    } else if (row.text_answer) {
      state[row.question_id] = row.text_answer;
    }
  }
  return state;
}

export function draftFromSubmitted(answers: DraftAnswerInput[]): AttemptAnswerDraft[] {
  return answers.map((row) => {
    if (Array.isArray(row.answer)) {
      return {
        question_id: row.question_id,
        selected_option_ids: row.answer.filter(Boolean),
        text_answer: null,
      };
    }
    const looksLikeUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        row.answer
      );
    if (looksLikeUuid) {
      return {
        question_id: row.question_id,
        selected_option_ids: row.answer ? [row.answer] : [],
        text_answer: null,
      };
    }
    return {
      question_id: row.question_id,
      selected_option_ids: null,
      text_answer: row.answer || null,
    };
  });
}

export function countUsedAttempts(
  attempts: Array<{ status: string }>
): number {
  return attempts.filter((row) => row.status !== "cancelled").length;
}
