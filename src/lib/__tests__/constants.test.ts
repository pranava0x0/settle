import { describe, it, expect } from "vitest";
import {
  APP_NAME,
  DISPUTE_STATUS,
  VOTE_SIDE,
  TIMER_PRESETS,
  SLUG_LENGTH,
  ROUTES,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
} from "@/lib/constants";

describe("DISPUTE_STATUS", () => {
  it("has exactly three statuses", () => {
    expect(Object.keys(DISPUTE_STATUS)).toHaveLength(3);
  });

  it("contains open, closed, and expired", () => {
    expect(DISPUTE_STATUS.OPEN).toBe("open");
    expect(DISPUTE_STATUS.CLOSED).toBe("closed");
    expect(DISPUTE_STATUS.EXPIRED).toBe("expired");
  });
});

describe("VOTE_SIDE", () => {
  it("has exactly two sides", () => {
    expect(Object.keys(VOTE_SIDE)).toHaveLength(2);
  });

  it("contains a and b", () => {
    expect(VOTE_SIDE.A).toBe("a");
    expect(VOTE_SIDE.B).toBe("b");
  });
});

describe("TIMER_PRESETS", () => {
  it("has four presets", () => {
    expect(TIMER_PRESETS).toHaveLength(4);
  });

  it("each preset has a label and numeric value", () => {
    for (const preset of TIMER_PRESETS) {
      expect(typeof preset.label).toBe("string");
      expect(typeof preset.value).toBe("number");
      expect(preset.value).toBeGreaterThan(0);
    }
  });

  it("presets are in ascending order", () => {
    for (let i = 1; i < TIMER_PRESETS.length; i++) {
      expect(TIMER_PRESETS[i].value).toBeGreaterThan(
        TIMER_PRESETS[i - 1].value,
      );
    }
  });

  it("includes expected durations", () => {
    const values = TIMER_PRESETS.map((p) => p.value);
    expect(values).toContain(15); // 15 minutes
    expect(values).toContain(60); // 1 hour
    expect(values).toContain(360); // 6 hours
    expect(values).toContain(1440); // 24 hours
  });
});

describe("SLUG_LENGTH", () => {
  it("is 8 characters", () => {
    expect(SLUG_LENGTH).toBe(8);
  });
});

describe("ROUTES", () => {
  it("has correct static routes", () => {
    expect(ROUTES.HOME).toBe("/");
    expect(ROUTES.LOGIN).toBe("/login");
    expect(ROUTES.DASHBOARD).toBe("/dashboard");
    expect(ROUTES.CREATE).toBe("/create");
  });

  it("generates correct dispute route from slug", () => {
    expect(ROUTES.DISPUTE("abc123")).toBe("/s/abc123");
    expect(ROUTES.DISPUTE("")).toBe("/s/");
  });
});

describe("PROTECTED_ROUTES", () => {
  it("includes dashboard and create", () => {
    expect(PROTECTED_ROUTES).toContain("/dashboard");
    expect(PROTECTED_ROUTES).toContain("/create");
  });

  it("does not include public routes", () => {
    expect(PROTECTED_ROUTES).not.toContain("/");
    expect(PROTECTED_ROUTES).not.toContain("/login");
  });
});

describe("PUBLIC_ROUTES", () => {
  it("includes home and login", () => {
    expect(PUBLIC_ROUTES).toContain("/");
    expect(PUBLIC_ROUTES).toContain("/login");
  });
});

describe("APP_NAME", () => {
  it("is Settle", () => {
    expect(APP_NAME).toBe("Settle");
  });
});
