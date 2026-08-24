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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createQuestion,
  updateQuestion,
  type QuestionFormPayload,
} from "@/lib/actions/questions";
import type { Question, QuestionType } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/types";
import { uploadQuestionImage, deleteQuestionImage } from "@/lib/supabase/upload-question-image";
import { ImagePlus, X as XIcon } from "lucide-react";

interface QuestionFormProps {
  quizId: string;
  nextSortOrder: number;
  question?: Question;
  onSuccess: () => void;
}

export function QuestionForm({
  quizId,
  nextSortOrder,
  question,
  onSuccess,
}: QuestionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(question?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Maximum image size: 5MB");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadQuestionImage(file);
      setImageUrl(url);
    } catch {
      setUploadError("Photo upload failed; please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (imageUrl) await deleteQuestionImage(imageUrl);
    setImageUrl(null);
  };

  const choiceOptions =
    question?.type === "single_choice" || question?.type === "multiple_choice"
      ? [...(question.options ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      : [];

  const shortAnswer =
    question?.type === "short_answer"
      ? question.options?.find((o) => o.is_correct)?.option_text ?? ""
      : "";

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuestionInput>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question: question?.question ?? "",
      type: question?.type ?? "single_choice",
      points: question?.points ?? 1,
      explanation: question?.explanation ?? "",
      options: choiceOptions.length
        ? choiceOptions.map((option) => ({
          option_text: option.option_text,
          is_correct: option.is_correct,
        }))
        : [
          { option_text: "", is_correct: true },
          { option_text: "", is_correct: false },
        ],
      correct_answer: shortAnswer,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "options" });
  const questionType = watch("type");
  const optionValues = watch("options") ?? [];
  const isChoiceQuestion =
    questionType === "single_choice" || questionType === "multiple_choice";

  const markCorrect = (index: number) => {
    if (questionType === "single_choice") {
      optionValues.forEach((_, i) => {
        setValue(`options.${i}.is_correct`, i === index, { shouldValidate: true });
      });
      return;
    }

    setValue(`options.${index}.is_correct`, !optionValues[index]?.is_correct, {
      shouldValidate: true,
    });
  };

  const handleTypeChange = (nextType: QuestionType) => {
    setValue("type", nextType);
    if (nextType === "multiple_choice") {
      const points = Number(watch("points"));
      if (points < 2) setValue("points", 2);
    }
  };

  const handle = (data: QuestionInput) => {
    setServerError(null);
    const payload: QuestionFormPayload = {
      quiz_id: quizId,
      question: data.question,
      type: data.type,
      points: data.points,
      sort_order: question?.sort_order ?? nextSortOrder,
      explanation: data.explanation || null,
      image_url: imageUrl,
      options: isChoiceQuestion
        ? (data.options ?? []).map((option) => ({
          option_text: option.option_text ?? "",
          is_correct: Boolean(option.is_correct),
        }))
        : [],
      correct_answer: data.type === "short_answer" ? data.correct_answer ?? "" : "",
    };

    startTransition(async () => {
      const result: ActionResult = question
        ? await updateQuestion(question.id, payload)
        : await createQuestion(payload);
      if (result.success) onSuccess();
      else setServerError(result.error ?? "Something went wrong");
    });
  };

  return (
    <form onSubmit={handleSubmit(handle)} className="space-y-5">
      <div>
        <Label htmlFor="question">Question</Label>
        <Textarea id="question" placeholder="What is..." {...register("question")} />
        {errors.question && (
          <p className="mt-1.5 text-xs text-destructive">{errors.question.message}</p>
        )}
      </div>
      <div>
        <Label>Image (optional)</Label>
        {imageUrl ? (
          <div className="relative mt-1.5 w-max">
            <img
              src={imageUrl}
              alt="Question"
              className="max-h-48 rounded-md border border-border object-contain"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-border shadow-sm"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label className="mt-1.5 flex h-24 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs text-muted hover:bg-gray-50">
            <ImagePlus className="h-4 w-4" />
            {uploading ? "Uploading..." : "Choose image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              disabled={uploading}
            />
          </label>
        )}
        {uploadError && <p className="mt-1.5 text-xs text-destructive">{uploadError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Type</Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(value) => handleTypeChange(value as QuestionType)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_choice">Single Choice</SelectItem>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="short_answer">Short Answer</SelectItem>
                  <SelectItem value="open_ended">Open Ended</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="points">Points</Label>
          <Input
            id="points"
            type="number"
            min={questionType === "multiple_choice" ? 2 : 0.5}
            step="0.5"
            {...register("points")}
          />
          {errors.points && (
            <p className="mt-1.5 text-xs text-destructive">{errors.points.message}</p>
          )}
        </div>
      </div>

      {isChoiceQuestion ? (
        <div>
          <Label className="mb-2">Options</Label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => markCorrect(index)}
                  aria-label={`Mark option ${index + 1} as correct`}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                    optionValues[index]?.is_correct
                      ? "border-primary bg-orange-50 text-primary"
                      : "border-border text-muted hover:bg-gray-50"
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </button>
                <Input
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  {...register(`options.${index}.option_text` as const)}
                />
                {fields.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {fields.length < 6 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => append({ option_text: "", is_correct: false })}
            >
              <Plus className="h-4 w-4" />
              Add option
            </Button>
          )}
          {errors.options && (
            <p className="mt-1.5 text-xs text-destructive">{errors.options.message}</p>
          )}
          <p className="mt-2 text-xs text-muted">
            Click letters to mark{" "}
            {questionType === "multiple_choice"
              ? "all correct options. Stored as is_correct on each option."
              : "the correct option. Stored as is_correct on that option."}
          </p>
        </div>
      ) : questionType === "short_answer" ? (
        <div>
          <Label htmlFor="correct_answer">Correct answer</Label>
          <Input
            id="correct_answer"
            placeholder="Expected answer"
            {...register("correct_answer")}
          />
          <p className="mt-1.5 text-xs text-muted">
            Saved as a hidden correct option and compared case-insensitively when grading.
          </p>
          {errors.correct_answer && (
            <p className="mt-1.5 text-xs text-destructive">{errors.correct_answer.message}</p>
          )}
        </div>
      ) : (
        <p className="rounded-md bg-gray-50 p-3 text-xs text-muted">
          Students get a free-text field. Open-ended answers are not auto-graded.
        </p>
      )}

      <div>
        <Label htmlFor="explanation">Explanation (optional)</Label>
        <Textarea
          id="explanation"
          placeholder="Shown to admins, and later on results after grading"
          {...register("explanation")}
        />
      </div>

      {serverError && <p className="text-xs text-destructive">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving..." : question ? "Save changes" : "Add question"}
      </Button>
    </form>
  );
}
