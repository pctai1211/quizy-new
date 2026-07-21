import { ListChecks, Users, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/admin/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: quizCount }, { count: submissionCount }, { count: batchCount }, { data: recent }] =
    await Promise.all([
      supabase.from("quizzes").select("*", { count: "exact", head: true }),
      supabase.from("submissions").select("*", { count: "exact", head: true }),
      supabase.from("batches").select("*", { count: "exact", head: true }),
      supabase
        .from("submissions")
        .select("id, name, email, batch_name, score, total_points, percentage, submitted_at, quizzes(title)")
        .order("submitted_at", { ascending: false })
        .limit(8),
    ]);

  return (
    <div>
      <PageHeader title="Dashboard" description="An overview of your quiz activity." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Quizzes" value={quizCount ?? 0} icon={ListChecks} />
        <StatCard label="Total Submissions" value={submissionCount ?? 0} icon={Users} />
        <StatCard label="Total Batches" value={batchCount ?? 0} icon={Layers} />
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Recent submissions</h2>

        {recent && recent.length > 0 ? (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((row) => {
                  const quizTitle = Array.isArray(row.quizzes)
                    ? row.quizzes[0]?.title
                    : (row.quizzes as { title: string } | null)?.title;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted">{row.email}</div>
                      </TableCell>
                      <TableCell>{quizTitle ?? "—"}</TableCell>
                      <TableCell>{row.batch_name}</TableCell>
                      <TableCell>
                        <Badge variant={row.percentage >= 50 ? "success" : "muted"}>
                          {row.score}/{row.total_points} · {row.percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted">{formatDate(row.submitted_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No submissions yet"
            description="Once students complete a published quiz, their submissions will appear here."
          />
        )}
      </div>
    </div>
  );
}
