import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().transform((val) => val.toLowerCase()),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email().transform((val) => val.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const createLoanSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
