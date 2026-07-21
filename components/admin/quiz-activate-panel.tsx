"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BatchSelectDialog } from "@/components/admin/batch-select-dialog";
import { activateQuiz, deactivateQuiz } from "@/lib/actions/quizzes";
import type { Quiz } from "@/lib/types";

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function QuizActivatePanel({ quiz }: { quiz: Quiz }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const activeUntilMs = quiz.active_until ? new Date(quiz.active_until).getTime() : null;
  const isActive = !!activeUntilMs && activeUntilMs > Date.now();

  const [secondsLeft, setSecondsLeft] = useState(() =>
    activeUntilMs ? Math.max(0, Math.round((activeUntilMs - Date.now()) / 1000)) : 0
  );
  const refreshedRef = useRef(false);

  useEffect(() => {
    if (!isActive) return;
    refreshedRef.current = false;
    const interval = setInterval(() => {
      const remaining = activeUntilMs ? Math.max(0, Math.round((activeUntilMs - Date.now()) / 1000)) : 0;
      setSecondsLeft(remaining);
      if (remaining <= 0 && !refreshedRef.current) {
        refreshedRef.current = true;
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, activeUntilMs, router]);

  if (!quiz.published) {
    return (
      <div className="rounded-lg border border-border p-4">
        <span className="text-sm font-semibold text-foreground">Activate</span>
        <p className="mt-1 text-xs text-muted">Publish the quiz first to activate it for students.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Activate</span>
            <Badge variant={isActive ? "success" : "muted"}>{isActive ? "Live" : "Inactive"}</Badge>
          </div>
          {isActive ? (
            <p className="mt-1 text-xs text-muted">
              {formatCountdown(secondsLeft)} left for: {quiz.active_batches.join(", ")}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">
              Opens the quiz to selected batches for 30 minutes; it closes on its own after that.
            </p>
          )}
        </div>

        {isActive ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await deactivateQuiz(quiz.id);
              router.refresh();
            }}
          >
            Deactivate now
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setDialogOpen(true)}>
            Activate
          </Button>
        )}
      </div>

      <BatchSelectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Activate quiz"
        description="Selected batches can attempt this quiz for the next 30 minutes."
        batchNames={quiz.published_batches}
        defaultSelected={quiz.published_batches}
        confirmLabel="Activate for 30 minutes"
        onConfirm={(names) => activateQuiz(quiz.id, names)}
        onSuccess={() => {
          setDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
