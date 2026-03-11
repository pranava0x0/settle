import { z } from "zod/v4";

export const createDisputeSchema = z.object({
  question: z
    .string()
    .min(3, "Question must be at least 3 characters")
    .max(280, "Question must be under 280 characters"),
  side_a: z
    .string()
    .min(1, "Side A is required")
    .max(140, "Side A must be under 140 characters"),
  side_b: z
    .string()
    .min(1, "Side B is required")
    .max(140, "Side B must be under 140 characters"),
  duration_minutes: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute")
    .max(10080, "Duration can't exceed 7 days"),
});

export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;

export const castVoteSchema = z.object({
  dispute_id: z.string().uuid("Invalid dispute ID"),
  side: z.enum(["a", "b"], { message: "Side must be 'a' or 'b'" }),
});

export type CastVoteInput = z.infer<typeof castVoteSchema>;

export const phoneSchema = z
  .string()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number is too long")
  .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format");

export const otpSchema = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^\d{6}$/, "OTP must be 6 digits");
