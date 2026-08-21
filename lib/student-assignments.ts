import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssignmentWindow } from "@/lib/quiz-access";

export type AssignmentRow = AssignmentWindow & { quiz_id: string };

export async function fetchStudentAssignmentRows(
  supabase: SupabaseClient,
  student: { id: string; class_ids: string[] },
  quizId?: string
): Promise<AssignmentRow[]> {
  let direct = supabase
    .from("quiz_assignments")
    .select("quiz_id, available_from, due_at, status")
    .eq("student_id", student.id);
  let byClass = student.class_ids.length
    ? supabase
        .from("quiz_class_assignments")
        .select("quiz_id, available_from, due_at, status")
        .in("class_id", student.class_ids)
    : null;

  if (quizId) {
    direct = direct.eq("quiz_id", quizId);
    if (byClass) byClass = byClass.eq("quiz_id", quizId);
  }

  const [{ data: directRows }, classResult] = await Promise.all([
    direct,
    byClass ? byClass : Promise.resolve({ data: [] as AssignmentRow[] }),
  ]);

  return [
    ...((directRows as AssignmentRow[] | null) ?? []),
    ...((classResult.data as AssignmentRow[] | null) ?? []),
  ];
}

export function groupAssignmentsByQuiz(rows: AssignmentRow[]): Map<string, AssignmentRow[]> {
  const byQuiz = new Map<string, AssignmentRow[]>();
  for (const row of rows) {
    const list = byQuiz.get(row.quiz_id) ?? [];
    list.push(row);
    byQuiz.set(row.quiz_id, list);
  }
  return byQuiz;
}
