import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { getCurrentStudent } from "@/lib/students-server";
import { fetchStudentAssignmentRows } from "@/lib/student-assignments";
import { canTakeAssignedQuiz } from "@/lib/quiz-access";
import { answersToState, countUsedAttempts } from "@/lib/attempts";
import type { PublicQuestion, PublicQuiz, QuizAnswerState } from "@/lib/types";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const isAdmin = profile.role === "admin" || profile.role === "teacher";

  const student = await getCurrentStudent();
  if (!student && !isAdmin) notFound();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, description, duration_minutes, status, is_public, max_attempts")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!quiz) notFound();

  if (isAdmin && !student) {
    const admin = createAdminClient();
    const { data: questionRows } = await admin
      .from("questions")
      .select("id, question, image_url, type, points, sort_order, options:question_options(id, option_text, sort_order)")
      .eq("quiz_id", id)
      .order("sort_order", { ascending: true });

    const questions: PublicQuestion[] = ((questionRows as PublicQuestion[] | null) ?? []).map(
      (question) => ({
        ...question,
        options: [...(question.options ?? [])].sort((a, b) => a.sort_order - b.sort_order),
      })
    );

    const publicQuiz: PublicQuiz = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      duration_minutes: quiz.duration_minutes,
      questions,
    };

    return (
      <QuizRunner
        quiz={publicQuiz}
        student={{
          name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Admin",
          email: profile.email ?? "",
          class_label: "Admin preview",
        }}
        existingAttempt={null}
        isPreview
        exitHref={`/admin/quizzes/${quiz.id}`} // sửa lại đúng route quản lý quiz của bạn
      />
    );
  }

  // Từ đây trở xuống giữ nguyên logic cũ dành cho student
  const [assignments, { data: attempts }] = await Promise.all([
    fetchStudentAssignmentRows(supabase, student!, id),
    supabase
      .from("quiz_attempts")
      .select("id, status, attempt_number, started_at")
      .eq("quiz_id", id)
      .eq("student_id", student!.id)
      .order("attempt_number", { ascending: false }),
  ]);

  const inProgress = (attempts ?? []).find((row) => row.status === "in_progress");
  const finished = (attempts ?? []).filter(
    (row) => row.status === "submitted" || row.status === "graded"
  );

  if (!inProgress && countUsedAttempts(attempts ?? []) >= quiz.max_attempts && finished[0]) {
    redirect(`/result/${finished[0].id}`);
  }

  if (!inProgress && !canTakeAssignedQuiz(assignments, quiz.is_public)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div>
          <h1 className="text-lg font-semibold text-foreground">This quiz isn&apos;t open right now</h1>
          <p className="mt-2 text-sm text-muted">
            It may not be assigned to you, not in its availability window yet, or the due time has
            passed. Check with your admin if you think this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: questionRows, error } = await admin
    .from("questions")
    .select("id, question, image_url, type, points, sort_order, options:question_options(id, option_text, sort_order)")
    .eq("quiz_id", id)
    .order("sort_order", { ascending: true });
  console.log(error)

  const questions: PublicQuestion[] = ((questionRows as PublicQuestion[] | null) ?? []).map(
    (question) => ({
      ...question,
      options: [...(question.options ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    })
  );

  const publicQuiz: PublicQuiz = {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    duration_minutes: quiz.duration_minutes,
    questions,
  };

  let initialAnswers: QuizAnswerState = {};
  if (inProgress) {
    const { data: saved } = await admin
      .from("attempt_answers")
      .select("question_id, selected_option_ids, text_answer")
      .eq("attempt_id", inProgress.id);
    initialAnswers = answersToState(saved ?? []);
  }

  const classLabel =
    student!.classes.length > 0 ? student!.classes.map((cls) => cls.name).join(", ") : "No class";

  return (
    <QuizRunner
      quiz={publicQuiz}
      student={{
        name: student!.name,
        email: student!.email,
        class_label: classLabel,
      }}
      existingAttempt={
        inProgress
          ? {
            id: inProgress.id,
            startedAt: inProgress.started_at,
            answers: initialAnswers,
          }
          : null
      }
    />
  );
}