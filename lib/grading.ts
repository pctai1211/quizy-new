import { normalizeAnswer } from "@/lib/utils";
import type { QuestionType } from "@/lib/types";

export type GradeOption = {
  id: string;
  option_text: string;
  is_correct: boolean;
};

export type GradeQuestion = {
  id: string;
  type: QuestionType;
  points: number;
  options: GradeOption[];
};

export type GradedAnswer = {
  question_id: string;
  selected_option_ids: string[] | null;
  text_answer: string | null;
  is_correct: boolean | null;
  points_awarded: number;
};

function selectedIds(answer: string | string[]): string[] {
  if (Array.isArray(answer)) return answer.filter(Boolean);
  if (!answer) return [];
  return [answer];
}

function asText(answer: string | string[]): string {
  return typeof answer === "string" ? answer : "";
}

export function isAutoGraded(type: QuestionType): boolean {
  return type !== "open_ended";
}

export function gradeQuestion(
  question: GradeQuestion,
  answer: string | string[]
): GradedAnswer {
  const options = question.options ?? [];
  const points = Number(question.points) || 0;

  if (question.type === "single_choice") {
    const permitted = new Set(options.map((option) => option.id));
    const chosen = selectedIds(answer).find((id) => permitted.has(id)) ?? null;
    const correctIds = options.filter((option) => option.is_correct).map((option) => option.id);
    const isCorrect = chosen !== null && correctIds.includes(chosen);

    return {
      question_id: question.id,
      selected_option_ids: chosen ? [chosen] : [],
      text_answer: null,
      is_correct: isCorrect,
      points_awarded: isCorrect ? points : 0,
    };
  }

  if (question.type === "multiple_choice") {
    const permitted = new Set(options.map((option) => option.id));
    const selected = [...new Set(selectedIds(answer).filter((id) => permitted.has(id)))];
    const correctIds = options.filter((option) => option.is_correct).map((option) => option.id);
    const correctSelections = selected.filter((id) => correctIds.includes(id)).length;
    const incorrectSelections = selected.filter((id) => !correctIds.includes(id)).length;
    const valuePerCorrect = correctIds.length ? points / correctIds.length : 0;
    const pointsAwarded = Math.max(
      0,
      (correctSelections - incorrectSelections) * valuePerCorrect
    );
    const isCorrect =
      correctIds.length > 0 &&
      correctSelections === correctIds.length &&
      incorrectSelections === 0;

    return {
      question_id: question.id,
      selected_option_ids: selected,
      text_answer: null,
      is_correct: isCorrect,
      points_awarded: Math.round(pointsAwarded * 100) / 100,
    };
  }

  if (question.type === "short_answer") {
    const text = asText(answer);
    const expected = options.find((option) => option.is_correct)?.option_text ?? "";
    const isCorrect =
      Boolean(text.trim()) &&
      Boolean(expected.trim()) &&
      normalizeAnswer(text) === normalizeAnswer(expected);

    return {
      question_id: question.id,
      selected_option_ids: null,
      text_answer: text,
      is_correct: isCorrect,
      points_awarded: isCorrect ? points : 0,
    };
  }

  return {
    question_id: question.id,
    selected_option_ids: null,
    text_answer: asText(answer),
    is_correct: null,
    points_awarded: 0,
  };
}

export function summarizeGrades(questions: GradeQuestion[], graded: GradedAnswer[]) {
  const totalPoints = questions
    .filter((question) => isAutoGraded(question.type))
    .reduce((sum, question) => sum + Number(question.points), 0);
  const score =
    Math.round(graded.reduce((sum, row) => sum + row.points_awarded, 0) * 100) / 100;
  const percentage =
    totalPoints > 0 ? Math.round((score / totalPoints) * 10000) / 100 : 0;

  return { score, totalPoints, percentage };
}
