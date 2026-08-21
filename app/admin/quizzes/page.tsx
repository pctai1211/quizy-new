import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { QuizzesTable } from "@/components/admin/quizzes-table";
import type { Quiz, QuizWithMeta } from "@/lib/types";

export default async function QuizzesPage() {
  const supabase = await createClient();

  const [
    { data: quizzes },
    { data: questions },
    { data: attempts },
    { data: classAssignments },
    { data: studentAssignments },
  ] = await Promise.all([
    supabase.from("quizzes").select("*").order("created_at", { ascending: false }),
    supabase.from("questions").select("id, quiz_id"),
    supabase.from("quiz_attempts").select("id, quiz_id"),
    supabase.from("quiz_class_assignments").select("quiz_id, classes ( name )"),
    supabase.from("quiz_assignments").select("quiz_id"),
  ]);

  const questionCounts = new Map<string, number>();
  (questions ?? []).forEach((q) => {
    questionCounts.set(q.quiz_id, (questionCounts.get(q.quiz_id) ?? 0) + 1);
  });

  const attemptCounts = new Map<string, number>();
  (attempts ?? []).forEach((row) => {
    attemptCounts.set(row.quiz_id, (attemptCounts.get(row.quiz_id) ?? 0) + 1);
  });

  const classNames = new Map<string, string[]>();
  (classAssignments ?? []).forEach((row) => {
    const related = row.classes as { name: string } | { name: string }[] | null;
    const name = Array.isArray(related) ? related[0]?.name : related?.name;
    if (!name) return;
    const list = classNames.get(row.quiz_id) ?? [];
    list.push(name);
    classNames.set(row.quiz_id, list);
  });

  const studentCounts = new Map<string, number>();
  (studentAssignments ?? []).forEach((row) => {
    studentCounts.set(row.quiz_id, (studentCounts.get(row.quiz_id) ?? 0) + 1);
  });

  const rows: QuizWithMeta[] = ((quizzes as Quiz[] | null) ?? []).map((quiz) => {
    const assignedClasses = classNames.get(quiz.id) ?? [];
    const studentCount = studentCounts.get(quiz.id) ?? 0;
    const parts: string[] = [];
    if (assignedClasses.length) parts.push(assignedClasses.join(", "));
    if (studentCount) parts.push(`${studentCount} student${studentCount === 1 ? "" : "s"}`);

    return {
      ...quiz,
      assignment_summary: parts.length ? parts.join(" · ") : null,
      question_count: questionCounts.get(quiz.id) ?? 0,
      attempt_count: attemptCounts.get(quiz.id) ?? 0,
    };
  });

  return (
    <div>
      <PageHeader
        title="Quizzes"
        description="Create quizzes, add questions, then assign them to classes or individual students."
      />
      <QuizzesTable quizzes={rows} />
    </div>
  );
}
