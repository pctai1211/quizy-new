import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { ResultsExplorer } from "@/components/admin/results-explorer";
import type { Batch, Quiz } from "@/lib/types";

const PAGE_SIZE = 15;

interface ResultsPageProps {
  searchParams: Promise<{
    q?: string;
    quiz?: string;
    batch?: string;
    page?: string;
  }>;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("submissions")
    .select("*, quizzes(title)", { count: "exact" })
    .order("submitted_at", { ascending: false });

  if (params.quiz) query = query.eq("quiz_id", params.quiz);
  if (params.batch) query = query.eq("batch_name", params.batch);
  if (params.q) query = query.or(`name.ilike.%${params.q}%,email.ilike.%${params.q}%`);

  const [{ data: submissions, count }, { data: quizzes }, { data: batches }] = await Promise.all([
    query.range(from, to),
    supabase.from("quizzes").select("*").order("title", { ascending: true }),
    supabase.from("batches").select("*").order("name", { ascending: true }),
  ]);

  const rows = (submissions ?? []).map((row) => ({
    ...row,
    quiz_title: Array.isArray(row.quizzes)
      ? row.quizzes[0]?.title ?? "—"
      : (row.quizzes as { title: string } | null)?.title ?? "—",
  }));

  return (
    <div>
      <PageHeader title="Results" description="Search and review every quiz submission." />
      <ResultsExplorer
        submissions={rows}
        quizzes={(quizzes as Quiz[]) ?? []}
        batches={(batches as Batch[]) ?? []}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
