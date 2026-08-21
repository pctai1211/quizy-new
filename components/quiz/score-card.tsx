import type { QuestionType } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export interface QuestionReview {
  id: string;
  question: string;
  type: QuestionType;
  correct_answers: string[];
  student_answer: string | string[];
  is_correct: boolean | null;
  points_awarded: number;
}

interface ScoreCardProps {
  studentName: string;
  quizTitle: string;
  score: number;
  totalPoints: number;
  percentage: number;
  reviews: QuestionReview[];
  pendingManualGrade?: boolean;
  backHref?: string;
}

function headingFor(percentage: number) {
  if (percentage >= 90) return "Outstanding work";
  if (percentage >= 80) return "Excellent work";
  if (percentage >= 70) return "Great job";
  if (percentage >= 60) return "Good effort";
  if (percentage >= 40) return "Keep practicing";
  return "Don't worry, keep learning";
}

function answerList(answer: string | string[]) {
  return Array.isArray(answer) ? answer : answer ? [answer] : [];
}

export function ScoreCard({
  studentName,
  quizTitle,
  score,
  totalPoints,
  percentage,
  reviews,
  pendingManualGrade = false,
  backHref
}: ScoreCardProps) {
  return (
    <div className="min-h-screen bg-white px-6 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl text-center">
        {backHref && (
          <div className="mb-4 text-left">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        )}
        <span className="text-lg font-semibold tracking-tight text-foreground">QUIZY</span>
        <div className="mt-8 rounded-lg border border-border p-6 shadow-card sm:p-10">
          <p className="text-sm text-muted">{quizTitle}</p>
          <h1 className="mt-1 text-xl font-semibold text-foreground">
            {headingFor(percentage)}, {studentName}!
          </h1>
          <div className="mt-8">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Auto graded score
            </p>
            <p className="mt-1 text-5xl font-semibold tracking-tight text-foreground">
              {score} <span className="text-2xl font-medium text-muted">/ {totalPoints}</span>
            </p>
            <p className="mt-3 text-lg font-medium text-primary">{percentage}%</p>
            {pendingManualGrade && (
              <p className="mt-2 text-xs text-muted">
                Open-ended questions are pending teacher grading.
              </p>
            )}
          </div>
          <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>
          <div className="mt-8 space-y-4 text-left">
            <h2 className="text-sm font-semibold">Answer Review</h2>
            {reviews.map((review, index) => {
              const isChoice =
                review.type === "single_choice" || review.type === "multiple_choice";
              const selected = answerList(review.student_answer);
              return (
                <div key={review.id} className="rounded-lg border border-border p-4">
                  <p className="text-sm font-medium">
                    Q{index + 1}. {review.question}
                  </p>
                  {review.type === "open_ended" ? (
                    <div className="mt-3 text-xs">
                      <p className="text-muted">Your response</p>
                      <p className="mt-1 whitespace-pre-wrap font-medium text-foreground">
                        {typeof review.student_answer === "string" && review.student_answer
                          ? review.student_answer
                          : "Not answered"}
                      </p>
                      <p className="mt-2 text-muted">Pending teacher grading</p>
                    </div>
                  ) : isChoice ? (
                    <div className="mt-3 space-y-3 text-xs">
                      <p className={review.is_correct ? "font-medium text-green-700" : "font-medium text-destructive"}>
                        {review.is_correct ? "Correct" : "Incorrect"}
                        {typeof review.points_awarded === "number"
                          ? ` · ${review.points_awarded} pts`
                          : ""}
                      </p>
                      <div>
                        <p className="font-medium text-muted">Selected</p>
                        {selected.length ? (
                          selected.map((answer) => (
                            <p key={answer} className="mt-1">
                              ✓ {answer}
                            </p>
                          ))
                        ) : (
                          <p className="mt-1 text-muted">Not answered</p>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-muted">Correct</p>
                        {review.correct_answers.map((answer) => (
                          <p key={answer} className="mt-1 text-green-700">
                            ✓ {answer}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3 text-xs">
                      <div>
                        <p className="text-muted">Your answer</p>
                        <p className="mt-1 whitespace-pre-wrap font-medium text-foreground">
                          {typeof review.student_answer === "string" && review.student_answer
                            ? review.student_answer
                            : "Not answered"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted">Expected answer</p>
                        <p className="mt-1 whitespace-pre-wrap font-medium text-green-700">
                          {review.correct_answers[0] ?? "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-xs text-muted">
            Your responses have been recorded. You may close this window.
          </p>
        </div>
      </div>
    </div>
  );
}
