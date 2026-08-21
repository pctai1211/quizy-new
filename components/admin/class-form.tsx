"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { classSchema, type ClassInput } from "@/lib/validations/class";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { Class } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/types";

interface ClassFormProps {
  classItem?: Class;
  onSubmit: (formData: FormData) => Promise<ActionResult>;
  onSuccess: () => void;
}

export function ClassForm({ classItem, onSubmit, onSuccess }: ClassFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClassInput>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: classItem?.name ?? "",
      description: classItem?.description ?? "",
      active: classItem?.active ?? true,
    },
  });

  const active = watch("active");

  const handle = (data: ClassInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("description", data.description ?? "");
    if (data.active) formData.set("active", "on");

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
        <Input id="name" placeholder="Summer 2026" {...register("name")} />
        {errors.name && <p className="mt-1.5 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Optional context for this class"
          {...register("description")}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
        <Label htmlFor="active" className="mb-0">
          Active
        </Label>
        <Switch id="active" checked={active} onCheckedChange={(v) => setValue("active", v)} />
      </div>

      {serverError && <p className="text-xs text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving..." : classItem ? "Save changes" : "Create class"}
      </Button>
    </form>
  );
}
