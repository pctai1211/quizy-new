"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quizSchema, type QuizInput } from "@/lib/validations/quiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateQuiz, createQuiz } from "@/lib/actions/quizzes";
import type { Quiz } from "@/lib/types";

interface QuizFormProps {
  quiz?: Quiz;
}

export function QuizForm({ quiz }: QuizFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuizInput>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: quiz?.title ?? "",
      description: quiz?.description ?? "",
      duration_minutes: quiz?.duration_minutes ?? 30,
    },
  });

  const handle = (data: QuizInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("title", data.title);
    formData.set("description", data.description ?? "");
    formData.set("duration_minutes", String(data.duration_minutes));

    startTransition(async () => {
      const result = quiz
        ? await updateQuiz(quiz.id, formData)
        : await createQuiz(formData);

      if (!result.success) {
        setServerError(result.error ?? "Something went wrong");
        return;
      }

      if (!quiz && "id" in result && result.id) {
        router.push(`/admin/quizzes/${result.id}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(handle)} className="space-y-5 max-w-xl">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" placeholder="Frontend Fundamentals Quiz" {...register("title")} />
        {errors.title && <p className="mt-1.5 text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" placeholder="Optional context shown to students" {...register("description")} />
      </div>

      <div>
        <Label htmlFor="duration_minutes">Duration (minutes)</Label>
        <Input
          id="duration_minutes"
          type="number"
          min={1}
          {...register("duration_minutes")}
        />
        {errors.duration_minutes && (
          <p className="mt-1.5 text-xs text-destructive">{errors.duration_minutes.message}</p>
        )}
      </div>

      {serverError && <p className="text-xs text-destructive">{serverError}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : quiz ? "Save changes" : "Create quiz"}
      </Button>
    </form>
  );
}
