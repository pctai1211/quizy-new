import { z } from "zod";

export const studentSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  batch_name: z.string().trim().min(1, "Batch is required").max(100),
});

export type StudentInput = z.infer<typeof studentSchema>;

export const studentLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export type StudentLoginInput = z.infer<typeof studentLoginSchema>;
