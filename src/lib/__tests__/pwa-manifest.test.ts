/**
 * Regression guard for ISSUE-033.
 *
 * `manifest.json` referenced /icon-192.png and /icon-512.png for months while
 * neither file existed, so "Add to Home Screen" produced a blank tile. Nothing
 * caught it because a manifest is data: it never imports the files it names, so
 * no build step, type check or page render can notice they are missing.
 *
 * This walks the manifest's own icon list rather than a hardcoded list of
 * filenames -- a literal typed beside the manifest would sit green through the
 * exact change it should catch (adding a fourth icon that doesn't exist).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

import { SQUABBLE_THEMES, DEFAULT_THEME } from "@/lib/constants";

const ROOT = path.resolve(__dirname, "../../..");
const PUBLIC = path.join(ROOT, "public");

type ManifestIcon = {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
};

const manifest = JSON.parse(
  readFileSync(path.join(PUBLIC, "manifest.json"), "utf8"),
) as { icons: ManifestIcon[]; theme_color: string; background_color: string };

/** The Ring canvas, from `.theme-ring { --ring-canvas }` in globals.css. */
const RING_CANVAS = "#f5e6d3";
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe("PWA manifest", () => {
  it("declares at least one icon", () => {
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it.each(manifest.icons.map((i) => [i.src, i] as const))(
    "%s exists on disk and is a real PNG of the declared size",
    (src, icon) => {
      expect(src.startsWith("/")).toBe(true);
      const file = path.join(PUBLIC, src.replace(/^\//, ""));
      expect(existsSync(file), `${src} is referenced by manifest.json but missing from public/`).toBe(true);

      const bytes = readFileSync(file);
      expect(bytes.subarray(0, 4).equals(PNG_MAGIC), `${src} is not a PNG`).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(500);

      // PNG IHDR: width/height are big-endian uint32 at bytes 16 and 20.
      const width = bytes.readUInt32BE(16);
      const height = bytes.readUInt32BE(20);
      const [declaredW, declaredH] = icon.sizes.split("x").map(Number);
      expect([width, height]).toEqual([declaredW, declaredH]);
      expect(icon.type).toBe("image/png");
    },
  );

  it("ships a maskable icon, so Android does not letterbox the mark", () => {
    const purposes = manifest.icons.flatMap((i) => (i.purpose ?? "any").split(/\s+/));
    expect(purposes).toContain("maskable");
  });

  it("ships an apple-touch-icon via Next's app-directory convention", () => {
    // Next emits <link rel="apple-touch-icon"> only for this exact filename.
    expect(existsSync(path.join(ROOT, "src/app/apple-icon.png"))).toBe(true);
  });

  it("theme_color matches the default theme's canvas, not white", () => {
    expect(DEFAULT_THEME).toBe(SQUABBLE_THEMES.RING);
    expect(manifest.theme_color.toLowerCase()).toBe(RING_CANVAS);
    expect(manifest.background_color.toLowerCase()).toBe(RING_CANVAS);
  });
});
