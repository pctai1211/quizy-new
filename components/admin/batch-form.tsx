"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { batchSchema, type BatchInput } from "@/lib/validations/batch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { Batch } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/batches";

interface BatchFormProps {
  batch?: Batch;
  onSubmit: (formData: FormData) => Promise<ActionResult>;
  onSuccess: () => void;
}

export function BatchForm({ batch, onSubmit, onSuccess }: BatchFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BatchInput>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      name: batch?.name ?? "",
      description: batch?.description ?? "",
      active: batch?.active ?? true,
    },
  });

  const active = watch("active");

  const handle = (data: BatchInput) => {
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
        <Textarea id="description" placeholder="Optional context for this batch" {...register("description")} />
      </div>

      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
        <Label htmlFor="active" className="mb-0">Active</Label>
        <Switch id="active" checked={active} onCheckedChange={(v) => setValue("active", v)} />
      </div>

      {serverError && <p className="text-xs text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving..." : batch ? "Save changes" : "Create batch"}
      </Button>
    </form>
  );
}
