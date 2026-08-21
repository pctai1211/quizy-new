import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStudent } from "@/lib/students-server";
import { startAttemptSchema } from "@/lib/validations/submission";
import { fetchStudentAssignmentRows } from "@/lib/student-assignments";
import { canTakeAssignedQuiz } from "@/lib/quiz-access";
import { answersToState, countUsedAttempts } from "@/lib/attempts";

export async function POST(request: Request) {
  const student = await getCurrentStudent();
  console.log(student);
  if (!student) {
    return NextResponse.json({ error: "Sign in as a student to start this quiz" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = startAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { quiz_id } = parsed.data;
  const supabase = createAdminClient();

  const { data: quiz, error: err } = await supabase
    .from("quizzes")
    .select("id, status, is_public, max_attempts")
    .eq("id", quiz_id)
    .single();
  console.log(err);

  console.log(quiz);
  if (!quiz || quiz.status !== "published") {
    return NextResponse.json({ error: "This quiz is not available" }, { status: 403 });
  }

  const assignments = await fetchStudentAssignmentRows(supabase, student, quiz_id);
  if (!canTakeAssignedQuiz(assignments, quiz.is_public)) {
    return NextResponse.json(
      { error: "This quiz is not assigned to you or is outside its availability window." },
      { status: 403 }
    );
  }

  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("id, status, attempt_number, started_at")
    .eq("quiz_id", quiz_id)
    .eq("student_id", student.id)
    .order("attempt_number", { ascending: false });

  const inProgress = (attempts ?? []).find((row) => row.status === "in_progress");
  if (inProgress) {
    const { data: saved } = await supabase
      .from("attempt_answers")
      .select("question_id, selected_option_ids, text_answer")
      .eq("attempt_id", inProgress.id);

    return NextResponse.json({
      attemptId: inProgress.id,
      startedAt: inProgress.started_at,
      answers: answersToState(saved ?? []),
    });
  }

  const finished = (attempts ?? []).filter(
    (row) => row.status === "submitted" || row.status === "graded"
  );
  if (countUsedAttempts(attempts ?? []) >= quiz.max_attempts) {
    return NextResponse.json(
      { error: "You've already submitted this quiz.", attemptId: finished[0]?.id },
      { status: 409 }
    );
  }

  const nextAttemptNumber =
    ((attempts ?? []).reduce((max, row) => Math.max(max, row.attempt_number), 0) || 0) + 1;

  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id,
      student_id: student.id,
      attempt_number: nextAttemptNumber,
      status: "in_progress",
    })
    .select("id, started_at")
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: "Unable to start attempt" }, { status: 500 });
  }

  await supabase
    .from("quiz_assignments")
    .update({ status: "started" })
    .eq("quiz_id", quiz_id)
    .eq("student_id", student.id)
    .eq("status", "assigned");

  return NextResponse.json({
    attemptId: attempt.id,
    startedAt: attempt.started_at,
    answers: {},
  });
}
