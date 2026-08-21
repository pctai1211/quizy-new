"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizTimer } from "@/components/quiz/quiz-timer";
import { QuestionCard } from "@/components/quiz/question-card";
import { formatDuration } from "@/lib/utils";
import type { PublicQuiz, QuizAnswerState } from "@/lib/types";

interface QuizRunnerProps {
  quiz: PublicQuiz;
  student: { name: string; email: string; class_label: string };
  existingAttempt?: {
    id: string;
    startedAt: string;
    answers: QuizAnswerState;
  } | null;
  isPreview?: boolean; // thêm dòng này
  exitHref?: string; // nơi quay về khi admin thoát preview
}

function storageKey(quizId: string) {
  return `quizy:${quizId}:cursor`;
}

export function QuizRunner({
  quiz,
  student,
  existingAttempt,
  isPreview = false,
  exitHref,
}: QuizRunnerProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "active" | "submitting">(
    isPreview ? "active" : existingAttempt ? "active" : "intro"
  );
  const [attemptId, setAttemptId] = useState<string | null>(existingAttempt?.id ?? null);
  const [answers, setAnswers] = useState<QuizAnswerState>(existingAttempt?.answers ?? {});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(
    existingAttempt ? new Date(existingAttempt.startedAt).getTime() : null
  );
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const saveTimer = useRef<number | null>(null);

  const hasTimer = !isPreview && (quiz.duration_minutes ?? 0) > 0;
  const durationSeconds = (quiz.duration_minutes ?? 0) * 60;

  useEffect(() => {
    if (isPreview) return;
    try {
      const raw = window.localStorage.getItem(storageKey(quiz.id));
      if (raw) {
        const parsed = JSON.parse(raw) as { currentIndex?: number };
        if (typeof parsed.currentIndex === "number") {
          setCurrentIndex(parsed.currentIndex);
        }
      }
    } catch {
      // Ignore malformed local storage state.
    }
  }, [quiz.id, isPreview]);

  const persistCursor = (index: number) => {
    if (isPreview) return;
    window.localStorage.setItem(storageKey(quiz.id), JSON.stringify({ currentIndex: index }));
  };

  const saveDraft = useCallback(
    (nextAnswers: QuizAnswerState, id: string) => {
      if (isPreview) return; // không lưu draft khi preview
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void fetch("/api/attempts/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attempt_id: id,
            answers: quiz.questions.map((question) => ({
              question_id: question.id,
              answer: nextAnswers[question.id] ?? "",
            })),
          }),
        });
      }, 800);
    },
    [quiz.questions, isPreview]
  );

  const handleStart = async () => {
    setError(null);
    try {
      const res = await fetch("/api/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: quiz.id }),
      });
      const data = await res.json();
      if (res.status === 409 && data.attemptId) {
        router.push(`/result/${data.attemptId}`);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Unable to start quiz");

      setAttemptId(data.attemptId as string);
      setStartedAt(new Date(data.startedAt as string).getTime());
      setAnswers((data.answers as QuizAnswerState) ?? {});
      setPhase("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start quiz");
    }
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    if (attemptId) saveDraft(next, attemptId);
  };

  const goTo = (index: number) => {
    setCurrentIndex(index);
    persistCursor(index);
  };

  const submitQuiz = useCallback(async () => {
    if (isPreview) return; // an toàn tuyệt đối: preview không bao giờ submit
    if (submittedRef.current) return;
    submittedRef.current = true;
    setPhase("submitting");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quiz.id,
          attempt_id: attemptId,
          answers: quiz.questions.map((q) => ({
            question_id: q.id,
            answer: answers[q.id] ?? "",
          })),
        }),
      });

      const data = await res.json();
      const resultId = data.attemptId as string | undefined;

      if (res.status === 409 && resultId) {
        window.localStorage.removeItem(storageKey(quiz.id));
        router.push(`/result/${resultId}`);
        return;
      }

      if (!res.ok) throw new Error(data.error ?? "Submission failed");

      window.localStorage.removeItem(storageKey(quiz.id));
      router.push(`/result/${resultId}`);
    } catch (err) {
      submittedRef.current = false;
      setPhase("active");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }, [attemptId, quiz.id, quiz.questions, answers, router, isPreview]);

  const initialSeconds = useMemo(() => {
    if (!startedAt) return durationSeconds;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(0, durationSeconds - elapsed);
  }, [startedAt, durationSeconds]);

  useEffect(() => {
    if (
      !isPreview &&
      phase === "active" &&
      hasTimer &&
      startedAt &&
      initialSeconds === 0 &&
      !submittedRef.current
    ) {
      void submitQuiz();
    }
  }, [phase, hasTimer, startedAt, initialSeconds, submitQuiz, isPreview]);

  const handleExitPreview = () => {
    if (exitHref) {
      router.push(exitHref);
    } else {
      router.back();
    }
  };

  if (phase === "intro") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <span className="text-lg font-semibold tracking-tight text-foreground">QUIZY</span>
          </div>

          <div className="rounded-lg border border-border p-6 shadow-card sm:p-8">
            <p className="text-sm text-muted">Hi {student.name.split(" ")[0]},</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">{quiz.title}</h1>
            {quiz.description && <p className="mt-2 text-sm text-muted">{quiz.description}</p>}

            <div className="mt-5 flex flex-wrap gap-2">
              {hasTimer && (
                <span className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(quiz.duration_minutes)}
                </span>
              )}
              <span className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-foreground">
                <ListChecks className="h-3.5 w-3.5" />
                {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"}
              </span>
            </div>

            <p className="mt-5 text-xs text-muted">
              Submitting as {student.name} ({student.email}) · {student.class_label}
            </p>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            <Button className="mt-6 w-full" size="lg" onClick={handleStart}>
              Start Quiz
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentIndex];
  const isLast = currentIndex === quiz.questions.length - 1;
  const isFirst = currentIndex === 0;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[768px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight text-foreground">QUIZY</span>
            {isPreview && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Preview mode
              </span>
            )}
          </div>
          {startedAt && hasTimer && (
            <QuizTimer initialSeconds={initialSeconds} onExpire={submitQuiz} />
          )}
        </div>
        <div className="mx-auto max-w-[768px] px-6 pb-3">
          <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 sm:py-14">
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            index={currentIndex}
            total={quiz.questions.length}
            value={answers[currentQuestion.id] ?? ""}
            onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
          />
        )}
        {error && (
          <p className="mx-auto mt-6 max-w-[768px] text-center text-sm text-destructive">{error}</p>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-[768px] items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => goTo(currentIndex - 1)}
            disabled={isFirst || phase === "submitting"}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {isPreview ? (
            isLast ? (
              <Button onClick={handleExitPreview}>Exit preview</Button>
            ) : (
              <Button onClick={() => goTo(currentIndex + 1)}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )
          ) : isLast ? (
            <Button onClick={submitQuiz} disabled={phase === "submitting"}>
              {phase === "submitting" ? "Submitting..." : "Submit"}
            </Button>
          ) : (
            <Button onClick={() => goTo(currentIndex + 1)} disabled={phase === "submitting"}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}