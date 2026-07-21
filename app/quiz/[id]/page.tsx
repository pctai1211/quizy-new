import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { getCurrentStudent } from "@/lib/students-server";
import { isQuizLive } from "@/lib/utils";
import type { PublicQuestion, PublicQuiz } from "@/lib/types";

// Reads are done with the service-role client on the server (students
// never hold a Supabase Auth session, so there's no RLS context for them).
// This route never selects the `correct_answer` column, so answers can't
// leak to the client. Access itself is still gated: middleware.ts requires
// a logged-in student, and below we additionally require the quiz to be
// currently activated for that student's own batch.
export default async function PublicQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const student = await getCurrentStudent();
  if (!student) notFound();

  const supabase = createAdminClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, description, duration_minutes, published, published_batches, active_batches, active_until")
    .eq("id", id)
    .single();

  if (!quiz || !quiz.published) notFound();

  // Already took this quiz — send them to their result instead of letting
  // them start (and lose) a second attempt (also enforced in /api/submit).
  const { data: existingSubmission } = await supabase
    .from("submissions")
    .select("id")
    .eq("quiz_id", id)
    .ilike("email", student.email)
    .maybeSingle();

  if (existingSubmission) {
    redirect(`/result/${existingSubmission.id}`);
  }

  if (!isQuizLive(quiz, student.batch_name)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div>
          <h1 className="text-lg font-semibold text-foreground">This quiz isn&apos;t open right now</h1>
          <p className="mt-2 text-sm text-muted">
            Your admin activates each quiz for a 30-minute window. Check back once it&apos;s live, or ask
            your admin when it&apos;ll open.
          </p>
        </div>
      </div>
    );
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_text, question_type, points, sort_order, options:question_options(id, option_text, sort_order)")
    .eq("quiz_id", id)
    .order("sort_order", { ascending: true });

  const publicQuiz: PublicQuiz = {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    duration_minutes: quiz.duration_minutes,
    questions: ((questions as PublicQuestion[]) ?? []).map((q) => ({
      ...q,
      options: (q.options ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    })),
  };

  return (
    <QuizRunner
      quiz={publicQuiz}
      student={{ name: student.name, email: student.email, batch_name: student.batch_name }}
    />
  );
}
