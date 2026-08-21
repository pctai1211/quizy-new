import { z } from "zod";

const answersSchema = z.array(
  z.object({
    question_id: z.string().uuid(),
    answer: z.union([z.string().max(10000), z.array(z.string().max(2000)).max(20)]),
  })
);

export const submitQuizSchema = z.object({
  quiz_id: z.string().uuid(),
  attempt_id: z.string().uuid().optional(),
  answers: answersSchema,
});

export const startAttemptSchema = z.object({
  quiz_id: z.string().uuid(),
});

export const saveAttemptSchema = z.object({
  attempt_id: z.string().uuid(),
  answers: answersSchema,
});

export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
