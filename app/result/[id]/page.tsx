import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ScoreCard } from "@/components/quiz/score-card";
import type { QuestionType } from "@/lib/types";

function parseAnswer(value: string | null): string | string[] {
  if (!value) return "";
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : value; } catch { return value; }
}

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: submission } = await supabase.from("submissions").select("*, quizzes(title)").eq("id", id).single();
  if (!submission) notFound();
  const { data: responses } = await supabase.from("answers").select("is_correct, answer, questions ( id, question_text, correct_answer, correct_answers, question_type, sort_order, question_options ( id, option_text, sort_order ) )").eq("submission_id", id);
  const reviews = (responses ?? []).flatMap((response) => {
    const question = Array.isArray(response.questions) ? response.questions[0] : response.questions;
    if (!question) return [];
    return [{ id: String(question.id), question_text: String(question.question_text), question_type: question.question_type as QuestionType, correct_answer: String(question.correct_answer), correct_answers: Array.isArray(question.correct_answers) ? question.correct_answers.filter((item): item is string => typeof item === "string") : [], student_answer: parseAnswer(response.answer), is_correct: Boolean(response.is_correct), options: question.question_options ?? [], sort_order: question.sort_order ?? 0 }];
  }).sort((a, b) => a.sort_order - b.sort_order);
  const quizTitle = Array.isArray(submission.quizzes) ? submission.quizzes[0]?.title : (submission.quizzes as { title: string } | null)?.title;
  return <ScoreCard studentName={submission.name} quizTitle={quizTitle ?? "Quiz"} score={Number(submission.score)} totalPoints={submission.total_points} percentage={Number(submission.percentage)} reviews={reviews} />;
}
