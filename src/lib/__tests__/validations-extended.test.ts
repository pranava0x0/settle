import { describe, it, expect } from "vitest";
import {
  createDisputeSchema,
  castVoteSchema,
  phoneSchema,
  otpSchema,
} from "@/lib/validations";

describe("phoneSchema — auto-formatting", () => {
  it("auto-prepends +1 for 10-digit US number", () => {
    const result = phoneSchema.safeParse("2125551234");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("+12125551234");
    }
  });

  it("strips dashes before formatting", () => {
    const result = phoneSchema.safeParse("212-555-1234");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("+12125551234");
    }
  });

  it("strips parentheses and spaces", () => {
    const result = phoneSchema.safeParse("(212) 555-1234");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("+12125551234");
    }
  });

  it("handles 11-digit number starting with 1", () => {
    const result = phoneSchema.safeParse("12125551234");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("+12125551234");
    }
  });

  it("preserves existing + prefix", () => {
    const result = phoneSchema.safeParse("+442071234567");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("+442071234567");
    }
  });

  it("rejects number starting with 0 (not valid US)", () => {
    const result = phoneSchema.safeParse("0123456789");
    expect(result.success).toBe(false);
  });

  it("rejects number starting with 1 but only 10 digits", () => {
    // 1 + 9 digits = not matching 11-digit pattern
    const result = phoneSchema.safeParse("1234567890");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(phoneSchema.safeParse("").success).toBe(false);
  });

  it("rejects pure whitespace", () => {
    expect(phoneSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects special characters only", () => {
    expect(phoneSchema.safeParse("---()").success).toBe(false);
  });
});

describe("castVoteSchema — edge cases", () => {
  it("rejects missing dispute_id", () => {
    const result = castVoteSchema.safeParse({ side: "a" });
    expect(result.success).toBe(false);
  });

  it("rejects missing side", () => {
    const result = castVoteSchema.safeParse({
      dispute_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    expect(castVoteSchema.safeParse({}).success).toBe(false);
  });

  it("rejects null", () => {
    expect(castVoteSchema.safeParse(null).success).toBe(false);
  });

  it("rejects uppercase side", () => {
    const result = castVoteSchema.safeParse({
      dispute_id: "550e8400-e29b-41d4-a716-446655440000",
      side: "A",
    });
    expect(result.success).toBe(false);
  });
});

describe("createDisputeSchema — edge cases", () => {
  it("rejects null input", () => {
    expect(createDisputeSchema.safeParse(null).success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(createDisputeSchema.safeParse({}).success).toBe(false);
  });

  it("accepts exactly 280 character question", () => {
    const result = createDisputeSchema.safeParse({
      question: "x".repeat(280),
      side_a: "Yes",
      side_b: "No",
      duration_minutes: 60,
    });
    expect(result.success).toBe(true);
  });

  it("accepts exactly 140 character sides", () => {
    const result = createDisputeSchema.safeParse({
      question: "Test?",
      side_a: "a".repeat(140),
      side_b: "b".repeat(140),
      duration_minutes: 60,
    });
    expect(result.success).toBe(true);
  });

  it("accepts max duration of 7 days (10080 minutes)", () => {
    const result = createDisputeSchema.safeParse({
      question: "Week-long debate?",
      side_a: "Yes",
      side_b: "No",
      duration_minutes: 10080,
    });
    expect(result.success).toBe(true);
  });

  it("rejects string duration", () => {
    const result = createDisputeSchema.safeParse({
      question: "Test?",
      side_a: "Yes",
      side_b: "No",
      duration_minutes: "60",
    });
    expect(result.success).toBe(false);
  });
});

describe("otpSchema — edge cases", () => {
  it("rejects empty string", () => {
    expect(otpSchema.safeParse("").success).toBe(false);
  });

  it("rejects null", () => {
    expect(otpSchema.safeParse(null).success).toBe(false);
  });

  it("rejects numeric type (must be string)", () => {
    expect(otpSchema.safeParse(123456).success).toBe(false);
  });

  it("rejects OTP with spaces", () => {
    expect(otpSchema.safeParse("123 456").success).toBe(false);
  });

  it("accepts all-zeros", () => {
    expect(otpSchema.safeParse("000000").success).toBe(true);
  });

  it("accepts all-nines", () => {
    expect(otpSchema.safeParse("999999").success).toBe(true);
  });
});
