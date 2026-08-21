"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentSchema, type StudentInput } from "@/lib/validations/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import type { Class, Student } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/types";

interface StudentFormProps {
  student?: Student;
  classes: Class[];
  onSubmit: (formData: FormData) => Promise<ActionResult>;
  onSuccess: () => void;
}

export function StudentForm({ student, classes, onSubmit, onSuccess }: StudentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(student);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      first_name: student?.first_name ?? "",
      last_name: student?.last_name ?? "",
      email: student?.email ?? "",
      password: "",
      student_code: student?.student_code ?? "",
      phone: student?.phone ?? "",
      active: student?.active ?? true,
      class_ids: student?.class_ids ?? student?.classes?.map((c) => c.id) ?? [],
    },
  });

  const active = watch("active");
  const classIds = watch("class_ids") ?? [];

  const toggleClass = (classId: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...classIds, classId]))
      : classIds.filter((id) => id !== classId);
    setValue("class_ids", next, { shouldValidate: true });
  };

  const handle = (data: StudentInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("first_name", data.first_name);
    formData.set("last_name", data.last_name);
    formData.set("email", data.email);
    formData.set("password", data.password ?? "");
    formData.set("student_code", data.student_code ?? "");
    formData.set("phone", data.phone ?? "");
    formData.set("active", data.active ? "on" : "off");
    for (const id of data.class_ids ?? []) {
      formData.append("class_ids", id);
    }

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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="first_name">First name</Label>
          <Input id="first_name" placeholder="Jane" {...register("first_name")} />
          {errors.first_name && (
            <p className="mt-1.5 text-xs text-destructive">{errors.first_name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" placeholder="Doe" {...register("last_name")} />
          {errors.last_name && (
            <p className="mt-1.5 text-xs text-destructive">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="student@example.com" {...register("email")} />
        {errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="password">{isEdit ? "New password (optional)" : "Password"}</Label>
        <Input
          id="password"
          type="password"
          placeholder={isEdit ? "Leave blank to keep current" : "At least 6 characters"}
          {...register("password")}
        />
        {errors.password && (
          <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="student_code">Student code</Label>
          <Input id="student_code" placeholder="Optional" {...register("student_code")} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="Optional" {...register("phone")} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
        <Label htmlFor="active" className="mb-0">
          Active
        </Label>
        <Switch id="active" checked={active} onCheckedChange={(v) => setValue("active", v)} />
      </div>

      <div>
        <Label className="mb-2 block">Classes</Label>
        {classes.length === 0 ? (
          <p className="text-xs text-muted">Create a class first, then enroll this student.</p>
        ) : (
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-3">
            {classes.map((classItem) => {
              const checked = classIds.includes(classItem.id);
              return (
                <label
                  key={classItem.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggleClass(classItem.id, value === true)}
                  />
                  <span>{classItem.name}</span>
                  {!classItem.active && (
                    <span className="text-xs text-muted">(inactive)</span>
                  )}
                </label>
              );
            })}
          </div>
        )}
        {errors.class_ids && (
          <p className="mt-1.5 text-xs text-destructive">{errors.class_ids.message}</p>
        )}
      </div>

      {serverError && <p className="text-xs text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving..." : student ? "Save changes" : "Add student"}
      </Button>
    </form>
  );
}
