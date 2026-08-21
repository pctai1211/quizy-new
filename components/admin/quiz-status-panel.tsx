"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { publishQuiz, unpublishQuiz, setQuizPublic } from "@/lib/actions/quizzes";
import type { Quiz } from "@/lib/types";

export function QuizStatusPanel({ quiz }: { quiz: Quiz }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isPublished = quiz.status === "published";

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Status</span>
            <Badge variant={isPublished ? "success" : "muted"}>
              {quiz.status === "published"
                ? "Published"
                : quiz.status === "archived"
                  ? "Archived"
                  : "Draft"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted">
            Published quizzes can be assigned to classes or individual students.
          </p>
        </div>

        <div className="flex gap-2">
          {isPublished ? (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm" disabled={isPending}>
                  Unpublish
                </Button>
              }
              title="Unpublish quiz"
              description="Students will lose access unless the quiz is public or re-assigned after publishing again."
              confirmLabel="Unpublish"
              onConfirm={async () => {
                await unpublishQuiz(quiz.id);
                router.refresh();
              }}
            />
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await publishQuiz(quiz.id);
                  router.refresh();
                })
              }
            >
              Publish
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-md border border-border px-3 py-2.5">
        <div>
          <Label htmlFor="is_public" className="mb-0">
            Public quiz
          </Label>
          <p className="text-xs text-muted">Any signed-in student can open it when published.</p>
        </div>
        <Switch
          id="is_public"
          checked={quiz.is_public}
          disabled={isPending}
          onCheckedChange={(checked) =>
            startTransition(async () => {
              await setQuizPublic(quiz.id, checked);
              router.refresh();
            })
          }
        />
      </div>
    </div>
  );
}
