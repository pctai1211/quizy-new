import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { ResultsExplorer } from "@/components/admin/results-explorer";
import { nestedOne, studentDisplayFromJoin } from "@/lib/mappers/attempt";
import type { AttemptWithQuiz, Class, Quiz } from "@/lib/types";

const PAGE_SIZE = 15;

interface ResultsPageProps {
  searchParams: Promise<{
    q?: string;
    quiz?: string;
    class?: string;
    page?: string;
  }>;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const q = params.q?.trim();

  let studentIds: string[] | null = null;

  if (q) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
    studentIds = (profiles ?? []).map((row) => row.id);
  }

  if (params.class) {
    const { data: members } = await supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", params.class);
    const classStudentIds = (members ?? []).map((row) => row.student_id);
    studentIds = studentIds
      ? studentIds.filter((id) => classStudentIds.includes(id))
      : classStudentIds;
  }

  let query = supabase
    .from("quiz_attempts")
    .select(
      "id, quiz_id, student_id, score, total_points, percentage, submitted_at, status, quizzes(title), students(profiles(email, first_name, last_name), class_students(classes(name)))",
      { count: "exact" }
    )
    .in("status", ["submitted", "graded"])
    .order("submitted_at", { ascending: false });

  if (params.quiz) query = query.eq("quiz_id", params.quiz);
  if (studentIds) {
    if (studentIds.length === 0) {
      const [{ data: quizzes }, { data: classes }] = await Promise.all([
        supabase.from("quizzes").select("*").order("title", { ascending: true }),
        supabase.from("classes").select("*").order("name", { ascending: true }),
      ]);
      return (
        <div>
          <PageHeader title="Results" description="Search and review every quiz attempt." />
          <ResultsExplorer
            attempts={[]}
            quizzes={(quizzes as Quiz[]) ?? []}
            classes={(classes as Class[]) ?? []}
            total={0}
            page={page}
            pageSize={PAGE_SIZE}
          />
        </div>
      );
    }
    query = query.in("student_id", studentIds);
  }

  const [{ data: attempts, count }, { data: quizzes }, { data: classes }] = await Promise.all([
    query.range(from, to),
    supabase.from("quizzes").select("*").order("title", { ascending: true }),
    supabase.from("classes").select("*").order("name", { ascending: true }),
  ]);

  const rows: AttemptWithQuiz[] = (attempts ?? []).map((row) => {
    const student = studentDisplayFromJoin(row.students);

    return {
      id: row.id,
      quiz_id: row.quiz_id,
      name: student.name,
      email: student.email,
      class_names: student.class_names,
      score: Number(row.score),
      total_points: Number(row.total_points),
      percentage: Number(row.percentage),
      submitted_at: row.submitted_at,
      quiz_title: nestedOne(row.quizzes)?.title ?? "—",
      status: row.status,
    };
  });

  return (
    <div>
      <PageHeader title="Results" description="Search and review every quiz attempt." />
      <ResultsExplorer
        attempts={rows}
        quizzes={(quizzes as Quiz[]) ?? []}
        classes={(classes as Class[]) ?? []}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
