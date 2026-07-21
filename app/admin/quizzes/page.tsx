import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { QuizzesTable } from "@/components/admin/quizzes-table";
import type { QuizWithMeta } from "@/lib/types";

export default async function QuizzesPage() {
  const supabase = await createClient();

  const [{ data: quizzes }, { data: questions }, { data: submissions }] = await Promise.all([
    supabase.from("quizzes").select("*").order("created_at", { ascending: false }),
    supabase.from("questions").select("id, quiz_id"),
    supabase.from("submissions").select("id, quiz_id"),
  ]);

  const questionCounts = new Map<string, number>();
  (questions ?? []).forEach((q) => {
    questionCounts.set(q.quiz_id, (questionCounts.get(q.quiz_id) ?? 0) + 1);
  });
  const submissionCounts = new Map<string, number>();
  (submissions ?? []).forEach((s) => {
    submissionCounts.set(s.quiz_id, (submissionCounts.get(s.quiz_id) ?? 0) + 1);
  });

  const rows: QuizWithMeta[] = (quizzes ?? []).map((quiz) => ({
    ...quiz,
    batch_name: quiz.published_batches?.length ? quiz.published_batches.join(", ") : null,
    question_count: questionCounts.get(quiz.id) ?? 0,
    submission_count: submissionCounts.get(quiz.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader title="Quizzes" description="Create and manage your quizzes." />
      <QuizzesTable quizzes={rows} />
    </div>
  );
}
