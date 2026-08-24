import { z } from "zod";

const optionSchema = z.object({
  option_text: z.string().trim().optional().default(""),
  is_correct: z.boolean().optional().default(false),
});

export const questionSchema = z
  .object({
    question: z.string().trim().min(3, "Question must be at least 3 characters"),
    type: z.enum(["single_choice", "multiple_choice", "short_answer", "open_ended"]),
    points: z.coerce.number().min(0.5).max(100).default(1),
    explanation: z.string().trim().max(2000).optional().or(z.literal("")),
    options: z.array(optionSchema).optional(),
    correct_answer: z.string().trim().optional(),
    image_url: z.string().url().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "single_choice" || data.type === "multiple_choice") {
      if (!data.options || data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add at least 2 options",
          path: ["options"],
        });
      }

      if (data.options?.some((o) => !o.option_text?.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Every option must have text",
        });
      }

      const correctCount = (data.options ?? []).filter((o) => o.is_correct).length;

      if (data.type === "single_choice" && correctCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mark exactly one correct option",
          path: ["options"],
        });
      }

      if (data.type === "multiple_choice") {
        if (correctCount < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Select at least one correct option",
            path: ["options"],
          });
        }
        if (data.points < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Multiple choice questions must be worth at least 2 points",
            path: ["points"],
          });
        }
      }
    } else if (data.type === "short_answer") {
      if (!data.correct_answer?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter the correct answer",
          path: ["correct_answer"],
        });
      }
    }
  });

export type QuestionInput = z.infer<typeof questionSchema>;
