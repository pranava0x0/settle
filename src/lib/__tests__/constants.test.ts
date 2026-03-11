import { describe, it, expect } from "vitest";
import {
  APP_NAME,
  SQUABBLE_STATUS,
  VOTE_SIDE,
  TIMER_PRESETS,
  SLUG_LENGTH,
  ROUTES,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  SQUABBLE_THEMES,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  THEME_LIST,
  THEME_COLORS,
} from "@/lib/constants";

describe("SQUABBLE_STATUS", () => {
  it("has exactly three statuses", () => {
    expect(Object.keys(SQUABBLE_STATUS)).toHaveLength(3);
  });

  it("contains open, closed, and expired", () => {
    expect(SQUABBLE_STATUS.OPEN).toBe("open");
    expect(SQUABBLE_STATUS.CLOSED).toBe("closed");
    expect(SQUABBLE_STATUS.EXPIRED).toBe("expired");
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

  it("generates correct squabble route from slug", () => {
    expect(ROUTES.SQUABBLE("abc123")).toBe("/s/abc123");
    expect(ROUTES.SQUABBLE("")).toBe("/s/");
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
  it("is Squabble", () => {
    expect(APP_NAME).toBe("Squabble");
  });
});

describe("SQUABBLE_THEMES", () => {
  it("has exactly three themes", () => {
    expect(Object.keys(SQUABBLE_THEMES)).toHaveLength(3);
  });

  it("contains ring, molten, and impact", () => {
    expect(SQUABBLE_THEMES.RING).toBe("ring");
    expect(SQUABBLE_THEMES.MOLTEN).toBe("molten");
    expect(SQUABBLE_THEMES.IMPACT).toBe("impact");
  });
});

describe("DEFAULT_THEME", () => {
  it("defaults to ring (boxing)", () => {
    expect(DEFAULT_THEME).toBe("ring");
  });

  it("is a valid theme from SQUABBLE_THEMES", () => {
    const validThemes = Object.values(SQUABBLE_THEMES);
    expect(validThemes).toContain(DEFAULT_THEME);
  });
});

describe("THEME_STORAGE_KEY", () => {
  it("is a non-empty string", () => {
    expect(typeof THEME_STORAGE_KEY).toBe("string");
    expect(THEME_STORAGE_KEY.length).toBeGreaterThan(0);
  });
});

describe("THEME_LIST", () => {
  it("has exactly three entries", () => {
    expect(THEME_LIST).toHaveLength(3);
  });

  it("each entry has required fields", () => {
    for (const theme of THEME_LIST) {
      expect(typeof theme.id).toBe("string");
      expect(typeof theme.emoji).toBe("string");
      expect(typeof theme.label).toBe("string");
      expect(typeof theme.gradient).toBe("string");
      expect(typeof theme.activeRing).toBe("string");
      expect(theme.emoji.length).toBeGreaterThan(0);
      expect(theme.label.length).toBeGreaterThan(0);
    }
  });

  it("theme IDs match SQUABBLE_THEMES values", () => {
    const themeValues = Object.values(SQUABBLE_THEMES);
    for (const theme of THEME_LIST) {
      expect(themeValues).toContain(theme.id);
    }
  });

  it("has unique IDs", () => {
    const ids = THEME_LIST.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each theme has a Tailwind gradient class", () => {
    for (const theme of THEME_LIST) {
      expect(theme.gradient).toMatch(/^bg-gradient-to-/);
    }
  });

  it("each theme has a ring color class", () => {
    for (const theme of THEME_LIST) {
      expect(theme.activeRing).toMatch(/^ring-/);
    }
  });

  it("includes the default theme", () => {
    const ids = THEME_LIST.map((t) => t.id);
    expect(ids).toContain(DEFAULT_THEME);
  });
});

describe("THEME_COLORS", () => {
  it("has color entries for every theme in SQUABBLE_THEMES", () => {
    for (const themeId of Object.values(SQUABBLE_THEMES)) {
      expect(THEME_COLORS).toHaveProperty(themeId);
    }
  });

  it("each color entry has all required hex fields", () => {
    const requiredFields = [
      "background",
      "foreground",
      "card",
      "cardForeground",
      "muted",
      "mutedForeground",
    ];
    for (const themeId of Object.values(SQUABBLE_THEMES)) {
      const colors = THEME_COLORS[themeId];
      for (const field of requiredFields) {
        expect(colors).toHaveProperty(field);
        expect((colors as Record<string, string>)[field]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });
});
