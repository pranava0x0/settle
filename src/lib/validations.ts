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
  .transform((val) => {
    // Strip spaces, dashes, parens
    const stripped = val.replace(/[\s\-()]/g, "");
    // If 10-digit US number (no country code), prepend +1
    if (/^[2-9]\d{9}$/.test(stripped)) {
      return `+1${stripped}`;
    }
    // If starts with 1 and is 11 digits, prepend +
    if (/^1[2-9]\d{9}$/.test(stripped)) {
      return `+${stripped}`;
    }
    // If already has +, return as-is
    if (stripped.startsWith("+")) {
      return stripped;
    }
    return stripped;
  })
  .pipe(
    z
      .string()
      .regex(/^\+[1-9]\d{9,14}$/, "Invalid phone number format")
  );

export const otpSchema = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^\d{6}$/, "OTP must be 6 digits");

export const displayNameSchema = z
  .string()
  .min(1, "Name is required")
  .max(50, "Name must be under 50 characters")
  .transform((val) => val.trim())
  .pipe(z.string().min(1, "Name is required"));
