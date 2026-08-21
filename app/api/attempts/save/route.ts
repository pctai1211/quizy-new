import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStudent } from "@/lib/students-server";
import { saveAttemptSchema } from "@/lib/validations/submission";
import { draftFromSubmitted } from "@/lib/attempts";

export async function POST(request: Request) {
  const student = await getCurrentStudent();
  if (!student) {
    return NextResponse.json({ error: "Sign in as a student to save answers" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = saveAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select("id, student_id, status")
    .eq("id", parsed.data.attempt_id)
    .single();

  if (!attempt || attempt.student_id !== student.id) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "This attempt is no longer in progress" }, { status: 409 });
  }

  const drafts = draftFromSubmitted(parsed.data.answers).filter(
    (row) => (row.selected_option_ids && row.selected_option_ids.length > 0) || row.text_answer
  );

  if (drafts.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("attempt_answers").upsert(
    drafts.map((row) => ({
      attempt_id: attempt.id,
      question_id: row.question_id,
      selected_option_ids: row.selected_option_ids,
      text_answer: row.text_answer,
    })),
    { onConflict: "attempt_id,question_id" }
  );
  console.log(error)
  if (error) {
    return NextResponse.json({ error: "Unable to save answers" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
