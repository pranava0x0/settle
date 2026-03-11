import { describe, it, expect } from "vitest";
import {
  createDisputeSchema,
  castVoteSchema,
  phoneSchema,
  otpSchema,
  displayNameSchema,
} from "@/lib/validations";

describe("createDisputeSchema", () => {
  const valid = {
    question: "Is a hot dog a sandwich?",
    side_a: "Yes",
    side_b: "No",
    duration_minutes: 60,
  };

  it("accepts valid input", () => {
    expect(createDisputeSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty question", () => {
    const result = createDisputeSchema.safeParse({ ...valid, question: "" });
    expect(result.success).toBe(false);
  });

  it("rejects question under 3 characters", () => {
    const result = createDisputeSchema.safeParse({ ...valid, question: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects question over 280 characters", () => {
    const result = createDisputeSchema.safeParse({
      ...valid,
      question: "x".repeat(281),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty side_a", () => {
    const result = createDisputeSchema.safeParse({ ...valid, side_a: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty side_b", () => {
    const result = createDisputeSchema.safeParse({ ...valid, side_b: "" });
    expect(result.success).toBe(false);
  });

  it("rejects side_a over 140 characters", () => {
    const result = createDisputeSchema.safeParse({
      ...valid,
      side_a: "y".repeat(141),
    });
    expect(result.success).toBe(false);
  });

  it("rejects 0 duration", () => {
    const result = createDisputeSchema.safeParse({
      ...valid,
      duration_minutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative duration", () => {
    const result = createDisputeSchema.safeParse({
      ...valid,
      duration_minutes: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects duration over 7 days", () => {
    const result = createDisputeSchema.safeParse({
      ...valid,
      duration_minutes: 10081,
    });
    expect(result.success).toBe(false);
  });

  it("rejects float duration", () => {
    const result = createDisputeSchema.safeParse({
      ...valid,
      duration_minutes: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts minimum valid values", () => {
    const result = createDisputeSchema.safeParse({
      question: "abc",
      side_a: "x",
      side_b: "y",
      duration_minutes: 1,
    });
    expect(result.success).toBe(true);
  });
});

describe("castVoteSchema", () => {
  it("accepts valid vote for side a", () => {
    const result = castVoteSchema.safeParse({
      dispute_id: "550e8400-e29b-41d4-a716-446655440000",
      side: "a",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid vote for side b", () => {
    const result = castVoteSchema.safeParse({
      dispute_id: "550e8400-e29b-41d4-a716-446655440000",
      side: "b",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid uuid", () => {
    const result = castVoteSchema.safeParse({
      dispute_id: "not-a-uuid",
      side: "a",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid side", () => {
    const result = castVoteSchema.safeParse({
      dispute_id: "550e8400-e29b-41d4-a716-446655440000",
      side: "c",
    });
    expect(result.success).toBe(false);
  });
});

describe("phoneSchema", () => {
  it("accepts valid US phone with country code", () => {
    expect(phoneSchema.safeParse("+12125551234").success).toBe(true);
  });

  it("rejects too short phone number", () => {
    expect(phoneSchema.safeParse("12345").success).toBe(false);
  });

  it("rejects phone with letters", () => {
    expect(phoneSchema.safeParse("+1212abc1234").success).toBe(false);
  });

  it("rejects phone starting with 0", () => {
    expect(phoneSchema.safeParse("0123456789").success).toBe(false);
  });
});

describe("otpSchema", () => {
  it("accepts valid 6-digit OTP", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true);
  });

  it("rejects 5-digit code", () => {
    expect(otpSchema.safeParse("12345").success).toBe(false);
  });

  it("rejects 7-digit code", () => {
    expect(otpSchema.safeParse("1234567").success).toBe(false);
  });

  it("rejects alphabetic characters", () => {
    expect(otpSchema.safeParse("abc123").success).toBe(false);
  });
});

describe("displayNameSchema", () => {
  it("accepts a valid display name", () => {
    const result = displayNameSchema.safeParse("Alice");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("Alice");
  });

  it("trims whitespace", () => {
    const result = displayNameSchema.safeParse("  Bob  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("Bob");
  });

  it("rejects empty string", () => {
    expect(displayNameSchema.safeParse("").success).toBe(false);
  });

  it("rejects whitespace-only string", () => {
    expect(displayNameSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects names over 50 characters", () => {
    expect(displayNameSchema.safeParse("A".repeat(51)).success).toBe(false);
  });

  it("accepts names at exactly 50 characters", () => {
    expect(displayNameSchema.safeParse("A".repeat(50)).success).toBe(true);
  });
});
