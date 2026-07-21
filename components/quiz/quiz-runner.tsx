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
  student: { name: string; email: string; batch_name: string };
}

interface StoredState {
  answers: QuizAnswerState;
  currentIndex: number;
  startedAt: number;
}

function storageKey(quizId: string) {
  return `quizy:${quizId}`;
}

export function QuizRunner({ quiz, student }: QuizRunnerProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "active" | "submitting">("intro");
  const [answers, setAnswers] = useState<QuizAnswerState>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const durationSeconds = quiz.duration_minutes * 60;

  // Restore progress from localStorage on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(quiz.id));
      if (raw) {
        const parsed: StoredState = JSON.parse(raw);
        setAnswers(parsed.answers);
        setCurrentIndex(parsed.currentIndex);
        setStartedAt(parsed.startedAt);
        setPhase("active");
      }
    } catch {
      // Ignore malformed local storage state.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(
    (next: Partial<StoredState>) => {
      if (!startedAt && !next.startedAt) return;
      const state: StoredState = {
        answers: next.answers ?? answers,
        currentIndex: next.currentIndex ?? currentIndex,
        startedAt: next.startedAt ?? startedAt ?? Date.now(),
      };
      window.localStorage.setItem(storageKey(quiz.id), JSON.stringify(state));
    },
    [quiz.id, answers, currentIndex, startedAt]
  );

  const handleStart = () => {
    const now = Date.now();
    setStartedAt(now);
    setPhase("active");
    window.localStorage.setItem(
      storageKey(quiz.id),
      JSON.stringify({ answers: {}, currentIndex: 0, startedAt: now })
    );
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    persist({ answers: next });
  };

  const goTo = (index: number) => {
    setCurrentIndex(index);
    persist({ currentIndex: index });
  };

  const submitQuiz = useCallback(async () => {
    if (submittedRef.current || !startedAt) return;
    submittedRef.current = true;
    setPhase("submitting");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quiz.id,
          answers: quiz.questions.map((q) => ({
            question_id: q.id,
            answer: answers[q.id] ?? "",
          })),
        }),
      });

      const data = await res.json();

      // Already submitted (e.g. a second tab, or resuming after submitting
      // elsewhere) — send them to their existing result instead of erroring.
      if (res.status === 409 && data.submissionId) {
        window.localStorage.removeItem(storageKey(quiz.id));
        router.push(`/result/${data.submissionId}`);
        return;
      }

      if (!res.ok) throw new Error(data.error ?? "Submission failed");

      window.localStorage.removeItem(storageKey(quiz.id));
      router.push(`/result/${data.submissionId}`);
    } catch (err) {
      submittedRef.current = false;
      setPhase("active");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }, [startedAt, quiz.id, quiz.questions, answers, router]);

  const initialSeconds = useMemo(() => {
    if (!startedAt) return durationSeconds;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(0, durationSeconds - elapsed);
  }, [startedAt, durationSeconds]);

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
              <span className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-foreground">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(quiz.duration_minutes)}
              </span>
              <span className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-foreground">
                <ListChecks className="h-3.5 w-3.5" />
                {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"}
              </span>
            </div>

            <p className="mt-5 text-xs text-muted">
              Submitting as {student.name} ({student.email}) · {student.batch_name}
            </p>

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
          <span className="text-base font-semibold tracking-tight text-foreground">QUIZY</span>
          {startedAt && (
            <QuizTimer
              initialSeconds={initialSeconds}
              onExpire={submitQuiz}
            />
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

          {isLast ? (
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
