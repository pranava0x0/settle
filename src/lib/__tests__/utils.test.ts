import { describe, it, expect, vi, afterEach } from "vitest";
import {
  generateSlug,
  formatTimeRemaining,
  isExpired,
  getExpiresAt,
} from "@/lib/utils";
import { SLUG_LENGTH } from "@/lib/constants";

describe("generateSlug", () => {
  it("returns a string of SLUG_LENGTH characters", () => {
    const slug = generateSlug();
    expect(slug).toHaveLength(SLUG_LENGTH);
  });

  it("generates unique slugs", () => {
    const slugs = new Set(Array.from({ length: 100 }, () => generateSlug()));
    expect(slugs.size).toBe(100);
  });

  it("contains only URL-safe characters", () => {
    const slug = generateSlug();
    expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("isExpired", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for past dates", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isExpired(past)).toBe(true);
  });

  it("returns false for future dates", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isExpired(future)).toBe(false);
  });

  it("returns true when time is exactly now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    expect(isExpired("2025-01-01T00:00:00Z")).toBe(true);
    vi.useRealTimers();
  });
});

describe("getExpiresAt", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an ISO string for the future", () => {
    const result = getExpiresAt(60);
    const date = new Date(result);
    expect(date.getTime()).toBeGreaterThan(Date.now());
  });

  it("adds the correct duration in minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const result = getExpiresAt(15);
    expect(result).toBe("2025-01-01T00:15:00.000Z");
    vi.useRealTimers();
  });

  it("handles 24-hour duration", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const result = getExpiresAt(1440);
    expect(result).toBe("2025-01-02T00:00:00.000Z");
    vi.useRealTimers();
  });
});

describe("formatTimeRemaining", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Voting closed' for past dates", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(formatTimeRemaining(past)).toBe("Voting closed");
  });

  it("shows hours and minutes for long durations", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const expires = "2025-01-01T02:30:00Z";
    const result = formatTimeRemaining(expires);
    expect(result).toBe("2h 30m remaining");
    vi.useRealTimers();
  });

  it("shows minutes and seconds for short durations", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const expires = "2025-01-01T00:05:30Z";
    const result = formatTimeRemaining(expires);
    expect(result).toBe("5m 30s remaining");
    vi.useRealTimers();
  });

  it("shows only seconds for very short durations", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const expires = "2025-01-01T00:00:45Z";
    const result = formatTimeRemaining(expires);
    expect(result).toBe("45s remaining");
    vi.useRealTimers();
  });
});
