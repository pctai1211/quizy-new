"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import {
  Plus, Pencil, Trash2, BarChart3, ListChecks, Copy,
  ExternalLink, Check,
} from "lucide-react";
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

function statusBadge(status: QuizWithMeta["status"]) {
  if (status === "published") return <Badge variant="success">Published</Badge>;
  if (status === "archived") return <Badge variant="outline">Archived</Badge>;
  return <Badge variant="muted">Draft</Badge>;
}

export function QuizzesTable({ quizzes }: { quizzes: QuizWithMeta[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copiedQuizId, setCopiedQuizId] = useState<string | null>(null);

  const copyQuizLink = async (quizId: string) => {
    const url = `${window.location.origin}/quiz/${quizId}`;
    await navigator.clipboard.writeText(url);
    setCopiedQuizId(quizId);
    setTimeout(() => setCopiedQuizId(null), 800);
  };

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
          description="Create a quiz, add questions, then assign it to classes or students."
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
                <TableHead>Assigned to</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizzes.map((quiz) => {
                const published = quiz.status === "published";
                return (
                  <TableRow key={quiz.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/quizzes/${quiz.id}`} className="hover:text-primary">
                        {quiz.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted">{quiz.assignment_summary ?? "—"}</TableCell>
                    <TableCell className="text-muted">{quiz.question_count}</TableCell>
                    <TableCell className="text-muted">
                      {formatDuration(quiz.duration_minutes)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge(quiz.status)}
                        {quiz.is_public && <Badge variant="default">Public</Badge>}
                        {published ? (
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
                            <Link href={`/admin/quizzes/${quiz.id}`}>Assign</Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted">{quiz.attempt_count}</TableCell>
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
                        {published ? (
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
                              <Link href={`/quiz/${quiz.id}`} target="_blank" title="Open quiz">
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
                          description={`This will permanently delete "${quiz.title}" and all its questions, assignments, and attempts.`}
                          onConfirm={async () => {
                            await deleteQuiz(quiz.id);
                            router.refresh();
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
