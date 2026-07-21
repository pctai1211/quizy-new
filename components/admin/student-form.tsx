"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentSchema, type StudentInput } from "@/lib/validations/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Student } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/batches";

interface StudentFormProps {
  student?: Student;
  onSubmit: (formData: FormData) => Promise<ActionResult>;
  onSuccess: () => void;
}

export function StudentForm({ student, onSubmit, onSuccess }: StudentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: student?.name ?? "",
      email: student?.email ?? "",
      batch_name: student?.batch_name ?? "",
    },
  });

  const handle = (data: StudentInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("email", data.email);
    formData.set("batch_name", data.batch_name);

    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result.success) {
        onSuccess();
      } else {
        setServerError(result.error ?? "Something went wrong");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(handle)} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Full name" {...register("name")} />
        {errors.name && <p className="mt-1.5 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="student@example.com" {...register("email")} />
        {errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="batch_name">Batch</Label>
        <Input id="batch_name" placeholder="AI Crew Apex" {...register("batch_name")} />
        {errors.batch_name && (
          <p className="mt-1.5 text-xs text-destructive">{errors.batch_name.message}</p>
        )}
      </div>

      {serverError && <p className="text-xs text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving..." : student ? "Save changes" : "Add student"}
      </Button>
    </form>
  );
}
