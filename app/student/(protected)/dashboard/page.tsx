import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, ListChecks, PlayCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStudent } from "@/lib/students-server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDuration } from "@/lib/utils";

export default async function StudentDashboardPage() {
  const student = await getCurrentStudent();
  if (!student) {
    redirect("/student/login");
  }

  const supabase = createAdminClient();

  const [{ data: activeQuizzes }, { data: submissions }] = await Promise.all([
    supabase
      .from("quizzes")
      .select("id, title, description, duration_minutes, active_until")
      .eq("published", true)
      .contains("active_batches", [student.batch_name])
      .gt("active_until", new Date().toISOString())
      .order("active_until", { ascending: true }),
    supabase
      .from("submissions")
      .select("id, quiz_id, score, total_points, percentage, submitted_at, quizzes(title)")
      .ilike("email", student.email)
      .order("submitted_at", { ascending: false }),
  ]);

  const pastQuizzes = (submissions ?? []).map((row) => ({
    id: row.id,
    score: row.score,
    total_points: row.total_points,
    percentage: row.percentage,
    submitted_at: row.submitted_at,
    quiz_title: Array.isArray(row.quizzes) ? row.quizzes[0]?.title ?? "Quiz" : (row.quizzes as { title: string } | null)?.title ?? "Quiz",
  }));

  // Already-completed quizzes just redirect to the result (see
  // app/quiz/[id]/page.tsx), so leave them out of "active now" here too.
  const completedQuizIds = new Set((submissions ?? []).map((row) => row.quiz_id));
  const startableQuizzes = (activeQuizzes ?? []).filter((quiz) => !completedQuizIds.has(quiz.id));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Welcome, {student.name}</h1>
        <p className="mt-1 text-sm text-muted">Batch: {student.batch_name}</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-foreground">Active now</h2>
        {startableQuizzes.length > 0 ? (
          <div className="mt-3 space-y-3">
            {startableQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{quiz.title}</p>
                    <Badge variant="success">Live</Badge>
                  </div>
                  {quiz.description && <p className="mt-1 text-xs text-muted">{quiz.description}</p>}
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(quiz.duration_minutes)}
                  </p>
                </div>
                <Button asChild>
                  <Link href={`/quiz/${quiz.id}`}>
                    <PlayCircle className="h-4 w-4" />
                    Start Quiz
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted">
            No quiz is open for your batch right now. Check back once your admin activates one.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-foreground">Past quizzes</h2>
        {pastQuizzes.length > 0 ? (
          <div className="mt-3 rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastQuizzes.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.quiz_title}</TableCell>
                    <TableCell className="text-muted">
                      {submission.score}/{submission.total_points}
                    </TableCell>
                    <TableCell>
                      <Badge variant={submission.percentage >= 50 ? "success" : "muted"}>
                        {submission.percentage}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted">{formatDate(submission.submitted_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/result/${submission.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted">
            <ListChecks className="mr-1.5 inline h-4 w-4 align-[-2px]" />
            You haven&apos;t taken any quizzes yet.
          </p>
        )}
      </section>
    </div>
  );
}
