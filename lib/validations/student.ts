import { z } from "zod";

export const studentLoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type StudentLoginInput = z.infer<typeof studentLoginSchema>;

export const studentSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Enter a valid email address"),
  password: z
    .string()
    .refine((value) => value.length === 0 || value.length >= 6, {
      message: "Password must be at least 6 characters",
    })
    .optional()
    .or(z.literal("")),
  student_code: z.string().trim().max(50).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  active: z.boolean().default(true),
  class_ids: z.array(z.string().uuid()).default([]),
});

export type StudentInput = z.infer<typeof studentSchema>;

export const studentImportRowSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6).optional().or(z.literal("")),
  student_code: z.string().trim().max(50).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  /** Comma-separated class names */
  classes: z.string().trim().optional().or(z.literal("")),
});

export type StudentImportRow = z.infer<typeof studentImportRowSchema>;
