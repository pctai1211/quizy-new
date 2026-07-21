"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Plus, Pencil, Trash2, BarChart3, ListChecks, Copy,
  ExternalLink, Check,} from "lucide-react";
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
import { EmptyState } from "@/components/admin/empty-state";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { deleteQuiz, unpublishQuiz } from "@/lib/actions/quizzes";
import { formatDuration } from "@/lib/utils";
import type { QuizWithMeta } from "@/lib/types";

export function QuizzesTable({ quizzes }: { quizzes: QuizWithMeta[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
const copyQuizLink = async (quizId: string) => {
  const url = `${window.location.origin}/quiz/${quizId}`;

  await navigator.clipboard.writeText(url);

  setCopiedQuizId(quizId);

  setTimeout(() => {
    setCopiedQuizId(null);
  }, 800);
};
const [copiedQuizId, setCopiedQuizId] = useState<string | null>(null);
  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button asChild>
          <Link href="/admin/quizzes/new">
            <Plus className="h-4 w-4" />
            New quiz
          </Link>
        </Button>
      </div>

      {quizzes.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No quizzes yet"
          description="Create your first quiz to start collecting submissions."
          action={
            <Button asChild>
              <Link href="/admin/quizzes/new">Create quiz</Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quiz</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizzes.map((quiz) => (
                <TableRow key={quiz.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/quizzes/${quiz.id}`} className="hover:text-primary">
                      {quiz.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted">{quiz.batch_name ?? "—"}</TableCell>
                  <TableCell className="text-muted">{quiz.question_count}</TableCell>
                  <TableCell className="text-muted">{formatDuration(quiz.duration_minutes)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={quiz.published ? "success" : "muted"}>
                        {quiz.published ? "Published" : "Draft"}
                      </Badge>
                      {quiz.active_until && new Date(quiz.active_until) > new Date() && (
                        <Badge variant="default">Live</Badge>
                      )}
                      {quiz.published ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await unpublishQuiz(quiz.id);
                              router.refresh();
                            })
                          }
                        >
                          Unpublish
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/quizzes/${quiz.id}`}>Publish</Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted">{quiz.submission_count}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/quizzes/${quiz.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/results?quiz=${quiz.id}`}>
                          <BarChart3 className="h-4 w-4" />
                        </Link>
                      </Button>
                      {quiz.published ? (
  <>
    <Button
  variant="ghost"
  size="icon"
  onClick={() => copyQuizLink(quiz.id)}
  title="Copy quiz link"
>
  {copiedQuizId === quiz.id ? (
    <Check className="h-4 w-4 text-green-600 transition-all" />
  ) : (
    <Copy className="h-4 w-4 transition-all" />
  )}
</Button>

    <Button variant="ghost" size="icon" asChild>
      <Link
        href={`/quiz/${quiz.id}`}
        target="_blank"
        title="Open quiz"
      >
        <ExternalLink className="h-4 w-4" />
      </Link>
    </Button>
  </>
) : (
  <>
    <Button variant="ghost" size="icon" disabled title="Quiz not published">
      <Copy className="h-4 w-4 text-muted-foreground/40" />
    </Button>

    <Button variant="ghost" size="icon" disabled title="Quiz not published">
      <ExternalLink className="h-4 w-4 text-muted-foreground/40" />
    </Button>
  </>
)}
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                        title="Delete quiz"
                        description={`This will permanently delete "${quiz.title}" and all its questions and submissions.`}
                        onConfirm={async () => {
                          await deleteQuiz(quiz.id);
                          router.refresh();
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
