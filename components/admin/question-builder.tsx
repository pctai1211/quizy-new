"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { QuestionForm } from "@/components/admin/question-form";
import { deleteQuestion } from "@/lib/actions/questions";
import type { Question } from "@/lib/types";

export function QuestionBuilder({ quizId, questions }: { quizId: string; questions: Question[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);

  const sorted = [...questions].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted">
          {sorted.length} question{sorted.length === 1 ? "" : "s"} ·{" "}
          {sorted.filter((q) => q.question_type !== "short_answer" && q.question_type !== "open_ended").reduce((sum, q) => sum + q.points, 0)} auto-graded points
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add question
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No questions yet"
          description="Add single choice, multiple choice, short answer, or open ended questions."
          action={<Button onClick={() => setCreateOpen(true)}>Add question</Button>}
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((question, index) => (
            <div
              key={question.id}
              className="flex items-start gap-3 rounded-lg border border-border p-4"
            >
              <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted">Q{index + 1}</span>
                  <Badge variant="outline">
                    {{ mcq: "Single Choice", single_choice: "Single Choice", multiple_choice: "Multiple Choice", short_answer: "Short Answer", open_ended: "Open Ended" }[question.question_type]}
                  </Badge>
                  <Badge variant="muted">{question.points} pt{question.points === 1 ? "" : "s"}</Badge>
                </div>
                <p className="mt-1.5 text-sm text-foreground">{question.question_text}</p>
                {(question.question_type === "mcq" || question.question_type === "single_choice" || question.question_type === "multiple_choice") && question.options && (
                  <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {[...question.options]
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((option, i) => (
                        <div
                          key={option.id}
                          className={`rounded-md border px-2.5 py-1.5 text-xs ${
                            (question.question_type === "multiple_choice" ? question.correct_answers.includes(option.option_text) : option.option_text === question.correct_answer)
                              ? "border-green-200 bg-green-50 text-success"
                              : "border-border text-muted"
                          }`}
                        >
                          {String.fromCharCode(65 + i)}. {option.option_text}
                        </div>
                      ))}
                  </div>
                )}
               {(question.question_type === "short_answer" ||
  question.question_type === "open_ended") && (
    <p className="mt-2 text-xs text-muted">
        {question.question_type === "short_answer"
            ? "Correct answer:"
            : "Reference answer:"}

        <span className="text-foreground ml-1">
            {question.correct_answer || "None"}
        </span>
    </p>
)}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditing(question)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  }
                  title="Delete question"
                  description="This will permanently remove this question from the quiz."
                  onConfirm={async () => {
                    await deleteQuestion(question.id, quizId);
                    router.refresh();
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add question</DialogTitle>
            <DialogDescription>Choose a type and fill in the details.</DialogDescription>
          </DialogHeader>
          <QuestionForm
            quizId={quizId}
            nextSortOrder={sorted.length}
            onSuccess={() => {
              setCreateOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit question</DialogTitle>
            <DialogDescription>Update the question details.</DialogDescription>
          </DialogHeader>
          {editing && (
            <QuestionForm
              quizId={quizId}
              nextSortOrder={sorted.length}
              question={editing}
              onSuccess={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
