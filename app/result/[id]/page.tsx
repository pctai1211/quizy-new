import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nestedOne, studentDisplayFromJoin } from "@/lib/mappers/attempt";
import { ScoreCard } from "@/components/quiz/score-card";
import type { QuestionType } from "@/lib/types";

type OptionRow = {
  id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
};

type QuestionRow = {
  id: string;
  question: string;
  type: QuestionType;
  sort_order: number;
  question_options: OptionRow[] | null;
};

type AnswerRow = {
  is_correct: boolean | null;
  points_awarded: number;
  text_answer: string | null;
  selected_option_ids: string[] | null;
  questions: QuestionRow | QuestionRow[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function optionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) notFound();

  const admin = createAdminClient();
  const { data: attempt, error } = await admin
    .from("quiz_attempts")
    .select("*, quizzes(title), students(profiles(first_name, last_name, email))")
    .eq("id", id)
    .single();

  if (!attempt) notFound();
  if (profile.role === "student" && attempt.student_id !== user.id) notFound();

  const { data: responses } = await admin
    .from("attempt_answers")
    .select(
      "is_correct, points_awarded, text_answer, selected_option_ids, questions ( id, question, type, sort_order, question_options ( id, option_text, is_correct, sort_order ) )"
    )
    .eq("attempt_id", id);

  const reviews = ((responses as AnswerRow[] | null) ?? [])
    .flatMap((response) => {
      const question = one(response.questions);
      if (!question) return [];
      const options = [...(question.question_options ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order
      );
      const selectedIds = optionIds(response.selected_option_ids);
      const selectedTexts = options
        .filter((option) => selectedIds.includes(option.id))
        .map((option) => option.option_text);
      const correctTexts = options
        .filter((option) => option.is_correct)
        .map((option) => option.option_text);

      const studentAnswer =
        question.type === "single_choice" || question.type === "multiple_choice"
          ? question.type === "multiple_choice"
            ? selectedTexts
            : selectedTexts[0] ?? ""
          : response.text_answer ?? "";

      return [
        {
          id: question.id,
          question: question.question,
          type: question.type,
          correct_answers: correctTexts,
          student_answer: studentAnswer,
          is_correct: response.is_correct,
          points_awarded: Number(response.points_awarded),
          sort_order: question.sort_order ?? 0,
        },
      ];
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  const quizTitle = nestedOne(attempt.quizzes as { title: string } | { title: string }[] | null)?.title;
  const student = studentDisplayFromJoin(attempt.students);
  const studentName = student.name;

  const backHref = profile.role === "admin" ? "/admin/results" : "/student/dashboard";

  return (
    <ScoreCard
      studentName={studentName}
      quizTitle={quizTitle ?? "Quiz"}
      score={Number(attempt.score)}
      totalPoints={Number(attempt.total_points)}
      percentage={Number(attempt.percentage)}
      reviews={reviews}
      backHref={backHref}
    />
  );
}
