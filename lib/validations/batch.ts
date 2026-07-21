import { z } from "zod";

export const batchSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export type BatchInput = z.infer<typeof batchSchema>;
