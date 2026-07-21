import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitQuizSchema } from "@/lib/validations/submission";
import { normalizeAnswer } from "@/lib/utils";
import { getCurrentStudent } from "@/lib/students-server";

export async function POST(request: Request) {
  // Identity comes from the student's own session, never the request body —
  // otherwise anyone could POST here claiming to be a different student.
  const student = await getCurrentStudent();
  if (!student) {
    return NextResponse.json({ error: "Sign in as a student to submit this quiz" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = submitQuizSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 }
    );
  }

  const { quiz_id, answers } = parsed.data;
  const supabase = createAdminClient();

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, published, published_batches")
    .eq("id", quiz_id)
    .single();

  if (quizError || !quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }
  if (!quiz.published) {
    return NextResponse.json({ error: "This quiz is not available" }, { status: 403 });
  }
  // Once a student starts within the activation window we let them finish
  // and submit even if the 30-minute window closes mid-attempt — only
  // starting a fresh attempt requires the quiz to be currently active (see
  // app/quiz/[id]/page.tsx). Being in published_batches at all is still
  // required, so an unrelated batch can't submit by calling this API directly.
  if (!(quiz.published_batches ?? []).includes(student.batch_name)) {
    return NextResponse.json({ error: "Your batch isn't allowed to take this quiz" }, { status: 403 });
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, correct_answer, correct_answers, question_type, points, question_options(option_text)")
    .eq("quiz_id", quiz_id);

  if (questionsError || !questions || questions.length === 0) {
    return NextResponse.json({ error: "Unable to load quiz questions" }, { status: 500 });
  }

  // Grade entirely server-side; the client only supplies raw answers.
  let score = 0;
  let totalPoints = 0;
  const gradedAnswers = questions.map((question) => {
    const submitted = answers.find((a) => a.question_id === question.id)?.answer ?? "";
    const submittedText = typeof submitted === "string" ? submitted : JSON.stringify(submitted);
    const isAutoGraded = question.question_type === "mcq" || question.question_type === "single_choice" || question.question_type === "multiple_choice";
    if (isAutoGraded) totalPoints += question.points;

    let isCorrect = false;
    if (question.question_type === "multiple_choice") {
      const selected = Array.isArray(submitted) ? [...new Set(submitted)] : [];
      const correct = Array.isArray(question.correct_answers) ? question.correct_answers.filter((answer): answer is string => typeof answer === "string") : [];
      const permitted = new Set((question.question_options ?? []).map((option: { option_text: string }) => option.option_text));
      const validSelected = selected.filter((answer) => permitted.has(answer));
      const correctSelections = validSelected.filter((answer) => correct.includes(answer)).length;
      const incorrectSelections = validSelected.filter((answer) => !correct.includes(answer)).length;
      const valuePerCorrectOption = correct.length ? question.points / correct.length : 0;
      score += Math.max(0, (correctSelections - incorrectSelections) * valuePerCorrectOption);
      isCorrect = correct.length > 0 && correctSelections === correct.length && incorrectSelections === 0;
    } else if (question.question_type === "mcq" || question.question_type === "single_choice") {
      isCorrect = typeof submitted === "string" && submitted === question.correct_answer;
      if (isCorrect) score += question.points;
    } else if (question.question_type === "short_answer") {
      isCorrect = typeof submitted === "string" && normalizeAnswer(submitted) === normalizeAnswer(question.correct_answer);
    }

    return {
      question_id: question.id,
      answer: submittedText,
      is_correct: isCorrect,
    };
  });

  score = Math.round(score * 100) / 100;
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 10000) / 100 : 0;

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .insert({
      quiz_id,
      name: student.name,
      email: student.email,
      batch_name: student.batch_name,
      score,
      total_points: totalPoints,
      percentage,
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    return NextResponse.json({ error: "Unable to save submission" }, { status: 500 });
  }

  const { error: answersError } = await supabase.from("answers").insert(
    gradedAnswers.map((a) => ({ ...a, submission_id: submission.id }))
  );

  if (answersError) {
    return NextResponse.json({ error: "Unable to save answers" }, { status: 500 });
  }

  return NextResponse.json({ submissionId: submission.id });
}
