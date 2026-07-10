import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Invalid email").max(160),
  password: z.string().min(6, "Password must be at least 6 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email").max(160),
  password: z.string().min(1, "Password is required").max(200),
});

export const createLoanSchema = z.object({
  itemId: z.string().min(1, "itemId is required"),
  proposedReturnDate: z.string().datetime().optional().nullable(),
});

export const updateItemSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  creator: z.string().trim().max(160).optional(),
  isbn: z.string().trim().max(40).optional(),
  description: z.string().trim().max(2000).optional(),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR", "WORN"]).optional(),
  status: z
    .enum([
      "AVAILABLE",
      "REQUESTED",
      "IN_TRANSIT",
      "BORROWED",
      "RETURNED",
      "DISPUTED",
      "STOLEN",
      "REMOVED",
    ])
    .optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
  avatarUrl: z.string().trim().url().optional(),
  neighborhood: z.string().trim().max(120).optional(),
});

export const locationUpdateSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  zipCode: z.string().trim().max(20).optional(),
  neighborhood: z.string().trim().max(120).optional(),
});
