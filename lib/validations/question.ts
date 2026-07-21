import { z } from "zod";

const optionSchema = z.object({
  option_text: z.string().trim().optional().default(""),
});

export const questionSchema = z
  .object({
    question_text: z.string().trim().min(3, "Question must be at least 3 characters"),
    question_type: z.enum(["single_choice", "multiple_choice", "short_answer", "open_ended"]),
    points: z.coerce.number().int().min(1).max(100).default(1),
    options: z.array(optionSchema).optional(),
    correct_option_index: z.coerce.number().int().min(0).optional(),
    correct_option_indices: z.array(z.coerce.number().int().min(0)).optional(),
    correct_answer: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.question_type === "single_choice" || data.question_type === "multiple_choice") {
      if (!data.options || data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add at least 2 options",
          path: ["options"],
        });
      }

       if (data.options?.some(o => o.option_text.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["options"],
      message: "Every option must have text",
    });
  }
      if (data.question_type === "single_choice" && (
        data.correct_option_index === undefined ||
        !data.options ||
        data.correct_option_index < 0 ||
        data.correct_option_index >= (data.options?.length ?? 0)
      )) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select the correct option",
          path: ["correct_option_index"],
        });
      }
      if (data.question_type === "multiple_choice") {
        const selected = data.correct_option_indices ?? [];
        if (!data.options || selected.length === 0 || selected.some((index) => index >= data.options!.length)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select at least one correct option", path: ["correct_option_indices"] });
        }
        if (data.points < 2) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Multiple choice questions must be worth at least 2 points", path: ["points"] });
        }
      }
    } else if (data.question_type === "short_answer") {
      if (!data.correct_answer || data.correct_answer.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter the correct answer",
          path: ["correct_answer"],
        });
      }
    }
  });

export type QuestionInput = z.infer<typeof questionSchema>;
