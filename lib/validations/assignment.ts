import { z } from "zod";

export const assignmentScheduleSchema = z
  .object({
    quiz_id: z.string().uuid(),
    available_from: z.string().datetime({ offset: true }).nullable().optional(),
    due_at: z.string().datetime({ offset: true }).nullable().optional(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.available_from && data.due_at && data.due_at < data.available_from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Due time must be after available from",
        path: ["due_at"],
      });
    }
  });
