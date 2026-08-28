/**
 * Regression guard for the OG image routes.
 *
 * Both routes 500'd in production on 2026-08-28: satori rejects a raw NUMBER as
 * a JSX child (`{voteCount}`) with "Expected <div> to have explicit display:
 * flex ... if it has more than one child node" — an error that names child
 * count but actually fires on the node TYPE. Every shared link lost its preview
 * image and the share/download result buttons broke.
 *
 * These tests render the SHIPPED route handlers (Supabase mocked) rather than a
 * re-creation of their JSX, so reintroducing a bare numeric child anywhere in
 * either tree turns them red.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const DISPUTE = {
  id: "d-1",
  question: "Are we doing a pickle back?",
  side_a: "Yes corn husker strong",
  side_b: "Can you stop",
  status: "closed",
  winner_side: "a" as const,
};

type Fixture = {
  dispute: typeof DISPUTE | null;
  countA: number;
  countB: number;
  voteRows: Array<{
    side: string;
    created_at: string;
    users: { display_name: string | null; phone?: string | null } | null;
  }>;
};

let fixture: Fixture;

/** Minimal chainable stand-in for the postgrest builder the routes actually use. */
const makeClient = () => ({
  from(table: string) {
    const state = { table, head: false, side: null as string | null };
    const builder: Record<string, unknown> = {
      select(_sel: string, opts?: { head?: boolean }) {
        if (opts?.head) state.head = true;
        return builder;
      },
      eq(col: string, val: string) {
        if (col === "side") state.side = val;
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      single: () =>
        Promise.resolve({ data: fixture.dispute, error: null }),
      then(onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) {
        const result =
          state.table === "votes" && state.head
            ? { count: state.side === "a" ? fixture.countA : fixture.countB, error: null }
            : state.table === "votes"
              ? { data: fixture.voteRows, error: null }
              : { data: null, error: null };
        return Promise.resolve(result).then(onOk, onErr);
      },
    };
    return builder;
  },
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => makeClient(),
}));

// Default: no service role key, i.e. the local/dev path where the masked-phone
// fallback is unavailable. Individual tests override this.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    throw new Error("Missing Supabase admin env vars.");
  }),
}));

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

const expectPng = async (res: Response) => {
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("image/png");
  const bytes = new Uint8Array(await res.arrayBuffer());
  expect(Array.from(bytes.slice(0, 4))).toEqual(PNG_MAGIC);
  // A satori failure streams a truncated/empty body rather than a real image.
  expect(bytes.byteLength).toBeGreaterThan(1000);
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  fixture = {
    dispute: { ...DISPUTE },
    countA: 7,
    countB: 2,
    voteRows: [
      { side: "a", created_at: "2026-03-27T00:00:00Z", users: { display_name: "pranava", phone: null } },
      { side: "a", created_at: "2026-03-27T00:01:00Z", users: { display_name: null, phone: null } },
      { side: "b", created_at: "2026-03-27T00:02:00Z", users: null },
    ],
  };
});

describe("/s/[slug]/opengraph-image — link preview", () => {
  it("renders a PNG (numeric vote counts must not reach satori raw)", async () => {
    const mod = await import("../s/[slug]/opengraph-image");
    const res = await mod.default({ params: Promise.resolve({ slug: "z_tLCPbW" }) });
    await expectPng(res as unknown as Response);
  });

  it("renders the singular '1 vote' branch", async () => {
    fixture.countA = 1;
    fixture.countB = 0;
    const mod = await import("../s/[slug]/opengraph-image");
    const res = await mod.default({ params: Promise.resolve({ slug: "x" }) });
    await expectPng(res as unknown as Response);
  });

  it("renders the zero-vote branch", async () => {
    fixture.countA = 0;
    fixture.countB = 0;
    const mod = await import("../s/[slug]/opengraph-image");
    const res = await mod.default({ params: Promise.resolve({ slug: "x" }) });
    await expectPng(res as unknown as Response);
  });

  it("renders the fallback card when the squabble is missing", async () => {
    fixture.dispute = null;
    const mod = await import("../s/[slug]/opengraph-image");
    const res = await mod.default({ params: Promise.resolve({ slug: "nope" }) });
    await expectPng(res as unknown as Response);
  });
});

describe("/api/og/result/[slug] — shareable result image", () => {
  const call = async (url: string, slug = "z_tLCPbW") => {
    const mod = await import("../api/og/result/[slug]/route");
    return mod.GET(new Request(url), { params: Promise.resolve({ slug }) });
  };

  it("renders the wide format", async () => {
    await expectPng(await call("http://localhost/api/og/result/z_tLCPbW"));
  });

  it("renders the story format (voter names included)", async () => {
    await expectPng(
      await call("http://localhost/api/og/result/z_tLCPbW?format=story"),
    );
  });

  it("renders a tie, where there is no winner callout", async () => {
    fixture.dispute = { ...DISPUTE, winner_side: null as never, status: "expired" };
    fixture.countA = 3;
    fixture.countB = 3;
    await expectPng(await call("http://localhost/api/og/result/x?format=story"));
  });

  it("renders with zero votes without dividing by zero", async () => {
    fixture.countA = 0;
    fixture.countB = 0;
    fixture.voteRows = [];
    await expectPng(await call("http://localhost/api/og/result/x?format=story"));
  });

  it("404s for an unknown slug", async () => {
    fixture.dispute = null;
    const res = await call("http://localhost/api/og/result/nope", "nope");
    expect(res.status).toBe(404);
  });

  it("never renders a bare 'Anonymous' — unnamed voters get stable #N labels", async () => {
    // The story image is the artefact that gets screenshotted into a group
    // chat, so it must resolve labels through lib/voter-identity like the page
    // does. This asserts the wiring exists, not that satori drew the glyphs.
    const { resolveVoterLabels } = await import("@/lib/voter-identity");
    const labels = resolveVoterLabels(
      fixture.voteRows.map((r) => ({
        side: r.side as "a" | "b",
        display_name: r.users?.display_name ?? null,
        phone: r.users?.phone ?? null,
        voted_at: r.created_at,
        profile_readable: r.users !== null,
      })),
    ).map((v) => v.label);

    expect(labels).toEqual(["pranava", "Anonymous #2", "Anonymous #3"]);
    expect(labels).not.toContain("Anonymous");
  });
});
