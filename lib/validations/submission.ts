import { z } from "zod";

export const submitQuizSchema = z.object({
  quiz_id: z.string().uuid(),
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      answer: z.union([z.string().max(10000), z.array(z.string().max(2000)).max(20)]),
    })
  ),
});

export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
