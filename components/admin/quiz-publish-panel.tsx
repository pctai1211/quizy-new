"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { BatchSelectDialog } from "@/components/admin/batch-select-dialog";
import { publishQuiz, unpublishQuiz } from "@/lib/actions/quizzes";
import type { Quiz } from "@/lib/types";

export function QuizPublishPanel({ quiz, batchNames }: { quiz: Quiz; batchNames: string[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Publish</span>
            <Badge variant={quiz.published ? "success" : "muted"}>
              {quiz.published ? "Published" : "Draft"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted">
            {quiz.published && quiz.published_batches.length > 0
              ? `Allowed for: ${quiz.published_batches.join(", ")}`
              : "Choose which batches are allowed to take this quiz."}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDialogOpen(true)}>
            {quiz.published ? "Edit batches" : "Publish"}
          </Button>
          {quiz.published && (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm">
                  Unpublish
                </Button>
              }
              title="Unpublish quiz"
              description="Students won't be able to open this quiz anymore, and any active window will end immediately."
              confirmLabel="Unpublish"
              onConfirm={async () => {
                await unpublishQuiz(quiz.id);
                router.refresh();
              }}
            />
          )}
        </div>
      </div>

      <BatchSelectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={quiz.published ? "Edit allowed batches" : "Publish quiz"}
        description="Only students in these batches will ever be able to open this quiz."
        batchNames={batchNames}
        defaultSelected={quiz.published_batches}
        confirmLabel={quiz.published ? "Save batches" : "Publish"}
        onConfirm={(names) => publishQuiz(quiz.id, names)}
        onSuccess={() => {
          setDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
