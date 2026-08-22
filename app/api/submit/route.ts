import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitQuizSchema } from "@/lib/validations/submission";
import { getCurrentStudent } from "@/lib/students-server";
import { fetchStudentAssignmentRows } from "@/lib/student-assignments";
import { canTakeAssignedQuiz } from "@/lib/quiz-access";
import { countUsedAttempts } from "@/lib/attempts";
import { gradeQuestion, isAutoGraded, summarizeGrades, type GradeQuestion } from "@/lib/grading";
import type { QuestionType } from "@/lib/types";

export async function POST(request: Request) {
  const student = await getCurrentStudent();
  if (!student) {
    return NextResponse.json(
      { error: "Sign in as a student to submit this quiz" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = submitQuizSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 }
    );
  }

  const { quiz_id, attempt_id, answers } = parsed.data;
  const supabase = createAdminClient();

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, status, is_public, max_attempts")
    .eq("id", quiz_id)
    .single();

  if (quizError || !quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }
  if (quiz.status !== "published") {
    return NextResponse.json({ error: "This quiz is not available" }, { status: 403 });
  }

  const [{ data: existingAttempts }, assignments] = await Promise.all([
    supabase
      .from("quiz_attempts")
      .select("id, attempt_number, status")
      .eq("quiz_id", quiz_id)
      .eq("student_id", student.id)
      .order("attempt_number", { ascending: false }),
    fetchStudentAssignmentRows(supabase, student, quiz_id),
  ]);

  const inProgress =
    (existingAttempts ?? []).find((row) => row.id === attempt_id && row.status === "in_progress") ??
    (existingAttempts ?? []).find((row) => row.status === "in_progress");

  if (!inProgress && !canTakeAssignedQuiz(assignments, quiz.is_public)) {
    return NextResponse.json(
      { error: "This quiz is not assigned to you or is outside its availability window." },
      { status: 403 }
    );
  }

  const finished = (existingAttempts ?? []).filter(
    (row) => row.status === "submitted" || row.status === "graded"
  );

  if (!inProgress && countUsedAttempts(existingAttempts ?? []) >= quiz.max_attempts) {
    return NextResponse.json(
      { error: "You've already submitted this quiz.", attemptId: finished[0]?.id },
      { status: 409 }
    );
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, type, points, question_options(id, option_text, is_correct)")
    .eq("quiz_id", quiz_id);

  if (questionsError || !questions || questions.length === 0) {
    return NextResponse.json({ error: "Unable to load quiz questions" }, { status: 500 });
  }

  const gradeQuestions: GradeQuestion[] = questions.map((question) => ({
    id: question.id,
    type: question.type as QuestionType,
    points: Number(question.points),
    options: (question.question_options ?? []).map((option) => ({
      id: option.id,
      option_text: option.option_text,
      is_correct: option.is_correct,
    })),
  }));

  const graded = gradeQuestions.map((question) => {
    const submitted = answers.find((row) => row.question_id === question.id)?.answer ?? "";
    return gradeQuestion(question, submitted);
  });

  const { score, totalPoints, percentage } = summarizeGrades(gradeQuestions, graded);
  const needsManualGrade = gradeQuestions.some((question) => !isAutoGraded(question.type));
  const now = new Date().toISOString();
  const nextStatus = needsManualGrade ? "submitted" : "graded";

  let attempt = inProgress;

  if (!attempt) {
    const nextAttemptNumber =
      ((existingAttempts ?? []).reduce((max, row) => Math.max(max, row.attempt_number), 0) || 0) +
      1;
    const { data: created, error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id,
        student_id: student.id,
        attempt_number: nextAttemptNumber,
        status: "in_progress",
      })
      .select("id, attempt_number, status")
      .single();

    if (attemptError || !created) {
      if (attemptError?.code === "23505") {
        return NextResponse.json(
          { error: "You've already submitted this quiz.", attemptId: finished[0]?.id },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Unable to save attempt" }, { status: 500 });
    }
    attempt = created;
  }

  const { error: answersError } = await supabase.from("attempt_answers").upsert(
    graded.map((row) => ({
      attempt_id: attempt!.id,
      question_id: row.question_id,
      selected_option_ids: row.selected_option_ids,
      text_answer: row.text_answer,
      is_correct: row.is_correct,
      points_awarded: row.points_awarded,
    })),
    { onConflict: "attempt_id,question_id" }
  );
  console.log(answersError)

  if (answersError) {
    return NextResponse.json({ error: "Unable to save answers" }, { status: 500 });
  }

  const { error: finalizeError } = await supabase
    .from("quiz_attempts")
    .update({
      status: nextStatus,
      submitted_at: now,
      score,
      total_points: totalPoints,
      percentage,
      graded_at: needsManualGrade ? null : now,
    })
    .eq("id", attempt.id)
    .eq("status", "in_progress");

  if (finalizeError) {
    return NextResponse.json({ error: "Unable to finalize attempt" }, { status: 500 });
  }

  await supabase
    .from("quiz_assignments")
    .update({ status: "completed" })
    .eq("quiz_id", quiz_id)
    .eq("student_id", student.id)
    .in("status", ["assigned", "started"]);

  return NextResponse.json({ attemptId: attempt.id });
}
