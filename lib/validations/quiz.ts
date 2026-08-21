import { z } from "zod";

export const quizSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(150),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  duration_minutes: z.coerce
    .number({ invalid_type_error: "Enter a duration" })
    .int()
    .min(1, "Duration must be at least 1 minute")
    .max(600, "Duration must be under 600 minutes"),
});

export type QuizInput = z.infer<typeof quizSchema>;
