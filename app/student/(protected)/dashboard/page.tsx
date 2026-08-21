import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, ListChecks, PlayCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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
import {
  earliestDueAt,
  hasOpenAssignment,
  isUpcomingAssignment,
  type AssignmentWindow,
} from "@/lib/quiz-access";
import { fetchStudentAssignmentRows, groupAssignmentsByQuiz } from "@/lib/student-assignments";

type AssignedQuiz = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  max_attempts: number;
};

export default async function StudentDashboardPage() {
  const student = await getCurrentStudent();
  if (!student) {
    redirect("/login");
  }

  const supabase = await createClient();

  const [assignmentRows, { data: attempts }] = await Promise.all([
    fetchStudentAssignmentRows(supabase, student),
    supabase
      .from("quiz_attempts")
      .select("id, quiz_id, score, total_points, percentage, submitted_at, status, quizzes(title)")
      .eq("student_id", student.id)
      .order("started_at", { ascending: false }),
  ]);

  const byQuiz = groupAssignmentsByQuiz(assignmentRows);
  const assignedQuizIds = [...byQuiz.keys()];
  const { data: quizzes } = assignedQuizIds.length
    ? await supabase
        .from("quizzes")
        .select("id, title, description, duration_minutes, status, max_attempts")
        .in("id", assignedQuizIds)
        .eq("status", "published")
    : { data: [] as AssignedQuiz[] };

  const attemptsByQuiz = new Map<string, typeof attempts>();
  (attempts ?? []).forEach((row) => {
    const list = attemptsByQuiz.get(row.quiz_id) ?? [];
    list.push(row);
    attemptsByQuiz.set(row.quiz_id, list);
  });

  const assignedQuizzes = ((quizzes as AssignedQuiz[] | null) ?? [])
    .map((quiz) => {
      const windows = byQuiz.get(quiz.id) ?? [];
      const quizAttempts = attemptsByQuiz.get(quiz.id) ?? [];
      const inProgress = quizAttempts.find((row) => row.status === "in_progress");
      const finishedCount = quizAttempts.filter(
        (row) => row.status === "submitted" || row.status === "graded"
      ).length;
      const remaining = Math.max(0, quiz.max_attempts - finishedCount);
      const dueAt = earliestDueAt(windows);

      let state: "in_progress" | "open" | "upcoming" | "closed" | "done";
      if (inProgress) state = "in_progress";
      else if (remaining <= 0) state = "done";
      else if (hasOpenAssignment(windows)) state = "open";
      else if (windows.some((row: AssignmentWindow) => isUpcomingAssignment(row))) state = "upcoming";
      else state = "closed";

      return { quiz, windows, inProgress, remaining, dueAt, state };
    })
    .filter((row) => row.state !== "done");

  const pastQuizzes = (attempts ?? [])
    .filter((row) => row.status === "submitted" || row.status === "graded")
    .map((row) => ({
      id: row.id,
      score: row.score,
      total_points: row.total_points,
      percentage: row.percentage,
      submitted_at: row.submitted_at,
      status: row.status,
      quiz_title: Array.isArray(row.quizzes)
        ? row.quizzes[0]?.title ?? "Quiz"
        : (row.quizzes as { title: string } | null)?.title ?? "Quiz",
    }));

  const classLabel =
    student.classes.length > 0 ? student.classes.map((cls) => cls.name).join(", ") : "No class";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Welcome, {student.name}</h1>
        <p className="mt-1 text-sm text-muted">Classes: {classLabel}</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-foreground">Assigned to you</h2>
        {assignedQuizzes.length > 0 ? (
          <div className="mt-3 space-y-3">
            {assignedQuizzes.map(({ quiz, inProgress, remaining, dueAt, state }) => {
              const canStart = state === "open" || state === "in_progress";
              return (
                <div
                  key={quiz.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{quiz.title}</p>
                      <Badge
                        variant={
                          state === "open" || state === "in_progress"
                            ? "success"
                            : state === "upcoming"
                              ? "muted"
                              : "muted"
                        }
                      >
                        {state === "in_progress"
                          ? "In progress"
                          : state === "open"
                            ? "Open"
                            : state === "upcoming"
                              ? "Upcoming"
                              : "Closed"}
                      </Badge>
                    </div>
                    {quiz.description && (
                      <p className="mt-1 text-xs text-muted">{quiz.description}</p>
                    )}
                    <p className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted">
                      {(quiz.duration_minutes ?? 0) > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(quiz.duration_minutes)}
                        </span>
                      )}
                      {dueAt && <span>Due {formatDate(dueAt)}</span>}
                      <span>
                        {remaining} attempt{remaining === 1 ? "" : "s"} left
                      </span>
                    </p>
                  </div>
                  {canStart ? (
                    <Button asChild>
                      <Link href={`/quiz/${quiz.id}`}>
                        <PlayCircle className="h-4 w-4" />
                        {inProgress ? "Resume" : "Start Quiz"}
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled>
                      {state === "upcoming" ? "Not open yet" : "Closed"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted">
            No quiz is assigned to you right now. Your admin can assign a quiz to your class or to
            you directly.
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
                {pastQuizzes.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium">{attempt.quiz_title}</TableCell>
                    <TableCell className="text-muted">
                      {attempt.score}/{attempt.total_points}
                    </TableCell>
                    <TableCell>
                      <Badge variant={attempt.percentage >= 50 ? "success" : "muted"}>
                        {attempt.percentage}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted">
                      {attempt.submitted_at ? formatDate(attempt.submitted_at) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/result/${attempt.id}`}>View</Link>
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
