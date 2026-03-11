import { describe, it, expect } from "vitest";
import { THEME_COLORS, SQUABBLE_THEMES } from "@/lib/constants";

/**
 * Calculate relative luminance of a hex color per WCAG 2.1 spec.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const [sR, sG, sB] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );

  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

/**
 * Calculate contrast ratio between two hex colors per WCAG 2.1.
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 * Returns a value between 1 (identical) and 21 (black on white).
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG AA thresholds
const WCAG_AA_NORMAL_TEXT = 4.5;
const WCAG_AA_LARGE_TEXT = 3.0;

describe("Theme contrast ratios (WCAG AA compliance)", () => {
  const themeIds = Object.values(SQUABBLE_THEMES);

  for (const themeId of themeIds) {
    const colors = THEME_COLORS[themeId];

    describe(`${themeId} theme`, () => {
      it("foreground on background meets WCAG AA for normal text (≥4.5:1)", () => {
        const ratio = contrastRatio(colors.foreground, colors.background);
        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
      });

      it("foreground on card meets WCAG AA for normal text (≥4.5:1)", () => {
        const ratio = contrastRatio(colors.cardForeground, colors.card);
        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
      });

      it("muted foreground on background meets WCAG AA for normal text (≥4.5:1)", () => {
        const ratio = contrastRatio(colors.mutedForeground, colors.background);
        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
      });

      it("muted foreground on card meets WCAG AA for large text (≥3:1)", () => {
        const ratio = contrastRatio(colors.mutedForeground, colors.card);
        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE_TEXT);
      });

      it("muted foreground on muted background meets WCAG AA for large text (≥3:1)", () => {
        const ratio = contrastRatio(colors.mutedForeground, colors.muted);
        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE_TEXT);
      });

      it("foreground on muted background meets WCAG AA for normal text (≥4.5:1)", () => {
        const ratio = contrastRatio(colors.foreground, colors.muted);
        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
      });
    });
  }
});

describe("relativeLuminance", () => {
  it("returns 0 for pure black", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 4);
  });

  it("returns 1 for pure white", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 4);
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("returns 1 for identical colors", () => {
    expect(contrastRatio("#ff6b00", "#ff6b00")).toBeCloseTo(1, 4);
  });

  it("is commutative (order does not matter)", () => {
    const a = contrastRatio("#1a1a1a", "#f5e6d3");
    const b = contrastRatio("#f5e6d3", "#1a1a1a");
    expect(a).toBeCloseTo(b, 4);
  });
});
