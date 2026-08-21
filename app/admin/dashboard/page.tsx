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
import { nestedOne, studentDisplayFromJoin } from "@/lib/mappers/attempt";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: quizCount }, { count: attemptCount }, { count: classCount }, { data: recent }] =
    await Promise.all([
      supabase.from("quizzes").select("*", { count: "exact", head: true }),
      supabase
        .from("quiz_attempts")
        .select("*", { count: "exact", head: true })
        .in("status", ["submitted", "graded"]),
      supabase.from("classes").select("*", { count: "exact", head: true }),
      supabase
        .from("quiz_attempts")
        .select(
          "id, score, total_points, percentage, submitted_at, quizzes(title), students(profiles(email, first_name, last_name), class_students(classes(name)))"
        )
        .in("status", ["submitted", "graded"])
        .order("submitted_at", { ascending: false })
        .limit(8),
    ]);

  return (
    <div>
      <PageHeader title="Dashboard" description="An overview of your quiz activity." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Quizzes" value={quizCount ?? 0} icon={ListChecks} />
        <StatCard label="Total Attempts" value={attemptCount ?? 0} icon={Users} />
        <StatCard label="Total Classes" value={classCount ?? 0} icon={Layers} />
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Recent attempts</h2>

        {recent && recent.length > 0 ? (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((row) => {
                  const quizTitle = nestedOne(row.quizzes)?.title;
                  const student = studentDisplayFromJoin(row.students);

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-muted">{student.email}</div>
                      </TableCell>
                      <TableCell>{quizTitle ?? "—"}</TableCell>
                      <TableCell>{student.class_names || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={Number(row.percentage) >= 50 ? "success" : "muted"}>
                          {row.score}/{row.total_points} · {row.percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted">
                        {row.submitted_at ? formatDate(row.submitted_at) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No attempts yet"
            description="Once students complete an assigned quiz, their attempts will appear here."
          />
        )}
      </div>
    </div>
  );
}
