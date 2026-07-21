"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { questionSchema, type QuestionInput } from "@/lib/validations/question";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createQuestion, updateQuestion, type QuestionFormPayload } from "@/lib/actions/questions";
import type { Question } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/batches";

interface QuestionFormProps { quizId: string; nextSortOrder: number; question?: Question; onSuccess: () => void; }

export function QuestionForm({ quizId, nextSortOrder, question, onSuccess }: QuestionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const existingOptions = question?.options?.sort((a, b) => a.sort_order - b.sort_order) ?? [];
  const existingCorrectIndex = existingOptions.findIndex((option) => option.option_text === question?.correct_answer);
  const existingCorrectIndices = existingOptions.map((option, index) => question?.correct_answers?.includes(option.option_text) ? index : -1).filter((index) => index >= 0);
  const initialType = question?.question_type === "mcq" ? "single_choice" : question?.question_type ?? "single_choice";

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<QuestionInput>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question_text: question?.question_text ?? "",
      question_type: initialType,
      points: question?.points ?? 1,
      options: existingOptions.length ? existingOptions.map((option) => ({ option_text: option.option_text })) : [{ option_text: "" }, { option_text: "" }],
      correct_option_index: existingCorrectIndex >= 0 ? existingCorrectIndex : 0,
      correct_option_indices: existingCorrectIndices,
      correct_answer: question?.question_type === "short_answer" ? question.correct_answer : "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "options" });
  const questionType = watch("question_type");
  const correctOptionIndex = watch("correct_option_index");
  const correctOptionIndices = watch("correct_option_indices") ?? [];
  const isChoiceQuestion = questionType === "single_choice" || questionType === "multiple_choice";

  const handle = (data: QuestionInput) => {
     console.log("Submitting", data);
    setServerError(null);
    const payload: QuestionFormPayload = {
      quiz_id: quizId, question_text: data.question_text, question_type: data.question_type,
      points: data.points, sort_order: question?.sort_order ?? nextSortOrder,
      options: (data.question_type === "single_choice" || data.question_type === "multiple_choice") ? (data.options ?? []).map((option) => option.option_text) : [],
      correct_option_index: data.question_type === "single_choice" ? data.correct_option_index ?? 0 : null,
      correct_option_indices: data.question_type === "multiple_choice" ? data.correct_option_indices ?? [] : [],
      correct_answer:
  data.question_type === "short_answer" ||
  data.question_type === "open_ended"
    ? data.correct_answer ?? ""
    : "",
    };
    startTransition(async () => {
      const result: ActionResult = question ? await updateQuestion(question.id, payload) : await createQuestion(payload);
       console.log("SERVER PAYLOAD");
      if (result.success) onSuccess(); else setServerError(result.error ?? "Something went wrong");
    });
  };

  return <form onSubmit={handleSubmit(handle)} className="space-y-5">
    <div><Label htmlFor="question_text">Question</Label><Textarea id="question_text" placeholder="What is..." {...register("question_text")} />{errors.question_text && <p className="mt-1.5 text-xs text-destructive">{errors.question_text.message}</p>}</div>
    <div className="grid grid-cols-2 gap-4">
      <div><Label htmlFor="question_type">Type</Label><Controller control={control} name="question_type" render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="question_type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single_choice">Single Choice</SelectItem><SelectItem value="multiple_choice">Multiple Choice</SelectItem><SelectItem value="short_answer">Short Answer</SelectItem><SelectItem value="open_ended">Open Ended</SelectItem></SelectContent></Select>} /></div>
      <div><Label htmlFor="points">Points</Label><Input id="points" type="number" min={questionType === "multiple_choice" ? 2 : 1} {...register("points")} />{errors.points && <p className="mt-1.5 text-xs text-destructive">{errors.points.message}</p>}</div>
    </div>
    {isChoiceQuestion ? <div>
      <Label className="mb-2">Options</Label><div className="space-y-2">{fields.map((field, index) => <div key={field.id} className="flex items-center gap-2">
        <button type="button" onClick={() => questionType === "single_choice" ? setValue("correct_option_index", index) : setValue("correct_option_indices", correctOptionIndices.includes(index) ? correctOptionIndices.filter((item) => item !== index) : [...correctOptionIndices, index])} aria-label={`Mark option ${index + 1} as correct`} className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-xs font-medium transition-colors", (questionType === "single_choice" ? correctOptionIndex === index : correctOptionIndices.includes(index)) ? "border-primary bg-orange-50 text-primary" : "border-border text-muted hover:bg-gray-50")}>{String.fromCharCode(65 + index)}</button>
        <Input placeholder={`Option ${String.fromCharCode(65 + index)}`} {...register(`options.${index}.option_text` as const)} />
        {fields.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><X className="h-4 w-4" /></Button>}
      </div>)}</div>
      {fields.length < 6 && <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => append({ option_text: "" })}><Plus className="h-4 w-4" />Add option</Button>}
      {errors.options && <p className="mt-1.5 text-xs text-destructive">{errors.options.message}</p>}{errors.correct_option_index && <p className="mt-1.5 text-xs text-destructive">{errors.correct_option_index.message}</p>}{errors.correct_option_indices && <p className="mt-1.5 text-xs text-destructive">{errors.correct_option_indices.message}</p>}
      <p className="mt-2 text-xs text-muted">Click letters to mark {questionType === "multiple_choice" ? "all correct options." : "the correct option."}</p>
    </div> : questionType === "short_answer" ? <div><Label htmlFor="correct_answer">Correct answer</Label><Input id="correct_answer" placeholder="Expected answer" {...register("correct_answer")} /><p className="mt-1.5 text-xs text-muted">Compared case-insensitively, ignoring extra whitespace and punctuation.</p>{errors.correct_answer && <p className="mt-1.5 text-xs text-destructive">{errors.correct_answer.message}</p>}</div> : <p className="rounded-md bg-gray-50 p-3 text-xs text-muted">Students will receive a large response field. This response is stored exactly as entered and is not automatically graded.</p>}
   
    {serverError && <p className="text-xs text-destructive">{serverError}</p>}<Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Saving..." : question ? "Save changes" : "Add question"}</Button>
  </form>;
}
