"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentLoginSchema, type StudentLoginInput } from "@/lib/validations/student";
import { studentLogin } from "@/lib/actions/student-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function StudentLoginForm() {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentLoginInput>({ resolver: zodResolver(studentLoginSchema) });

  const onSubmit = (data: StudentLoginInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("email", data.email);
    if (redirectTo) formData.set("redirect_to", redirectTo);

    startTransition(async () => {
      const result = await studentLogin(formData);
      if (result?.error) setServerError(result.error);
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-xl font-semibold tracking-tight text-foreground">QUIZY</span>
        </div>

        <div className="rounded-lg border border-border p-6 shadow-card">
          <h1 className="text-base font-semibold text-foreground">Student sign in</h1>
          <p className="mt-1 text-sm text-muted">
            Enter the email your admin added you with — no password needed.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {serverError && <p className="text-xs text-destructive">{serverError}</p>}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing in..." : "Continue"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function StudentLoginPage() {
  return (
    <Suspense>
      <StudentLoginForm />
    </Suspense>
  );
}
