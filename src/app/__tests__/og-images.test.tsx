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

const CREATOR_ID = "creator-1";

const DISPUTE = {
  id: "d-1",
  question: "Are we doing a pickle back?",
  side_a: "Yes corn husker strong",
  side_b: "Can you stop",
  status: "closed",
  winner_side: "a" as const,
  creator_id: CREATOR_ID,
  // Long past, so `showResults` is true on the status check alone.
  expires_at: "2026-03-27T00:00:00Z",
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
  /** Who is requesting the image. `null` = an anonymous stranger with the URL. */
  user: { id: string } | null;
  /** Whether that user has a vote on this squabble. */
  ownVote: { side: string } | null;
};

let fixture: Fixture;

/**
 * Every `select()` string this run issued. The voter-roster query is the one
 * that reads names and phone numbers, so "did the gate hold?" is answerable as
 * "was that select ever issued?" -- an assertion about the request we made,
 * not about pixels we cannot read back out of a PNG.
 */
let selects: string[];

/**
 * PostgREST returns exactly the columns the projection asked for. The fake must
 * too: the route drops `phone` from its select whenever the admin client is
 * unavailable, and a fake that hands back the full fixture row regardless makes
 * the masked-phone rung look exercised when the real response would not have
 * carried a phone at all. Honouring the projection is what makes
 * `adminAvailable` a real variable rather than decoration.
 */
const projectVoteRows = (projection: string) =>
  fixture.voteRows.map((row) => {
    if (!row.users) return row;
    const { phone, ...rest } = row.users;
    return {
      ...row,
      users: projection.includes("phone") ? { ...rest, phone } : rest,
    };
  });

/** Minimal chainable stand-in for the postgrest builder the routes actually use. */
const makeClient = () => ({
  from(table: string) {
    const state = {
      table,
      head: false,
      side: null as string | null,
      voterRoster: false,
      ownVote: false,
      projection: "",
    };
    const builder: Record<string, unknown> = {
      select(sel: string, opts?: { head?: boolean }) {
        selects.push(sel);
        state.projection = sel;
        if (opts?.head) state.head = true;
        if (sel.includes("users(")) state.voterRoster = true;
        return builder;
      },
      eq(col: string, val: string) {
        if (col === "side") state.side = val;
        if (col === "user_id") state.ownVote = true;
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      single: () =>
        Promise.resolve(
          state.ownVote
            ? { data: fixture.ownVote, error: null }
            : { data: fixture.dispute, error: null },
        ),
      then(onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) {
        const result =
          state.table === "votes" && state.head
            ? { count: state.side === "a" ? fixture.countA : fixture.countB, error: null }
            : state.table === "votes"
              ? { data: projectVoteRows(state.projection), error: null }
              : { data: null, error: null };
        return Promise.resolve(result).then(onOk, onErr);
      },
    };
    return builder;
  },
});

const clientWithAuth = () => ({
  ...makeClient(),
  auth: {
    getUser: async () => ({ data: { user: fixture.user }, error: null }),
  },
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => clientWithAuth(),
}));

/**
 * Whether SUPABASE_SERVICE_ROLE_KEY is configured. Defaults to false — the
 * local/dev shape, and the one production is currently in — so tests that do
 * not opt in exercise the degraded path. Flip it to reach the masked-phone rung.
 */
let adminAvailable: boolean;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    if (!adminAvailable) throw new Error("Missing Supabase admin env vars.");
    return makeClient();
  },
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
  selects = [];
  adminAvailable = false;
  fixture = {
    user: { id: CREATOR_ID },
    ownVote: { side: "a" },
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

  // The image endpoint bypasses RLS on purpose (admin client, for the masked
  // phone), so RLS cannot gate it. These pin the gate that replaces it. The
  // property under test is "the roster was never read" rather than "the PNG has
  // no names in it", because text cannot be read back out of a rendered image.
  describe("voter-identity gate (must match shouldShowVoters in page.tsx)", () => {
    const rosterWasRead = () => selects.some((sel) => sel.includes("users("));

    it("does not read the voter roster for an anonymous stranger with the URL", async () => {
      fixture.user = null;
      fixture.ownVote = null;
      const res = await call("http://localhost/api/og/result/z_tLCPbW?format=story");
      await expectPng(res);
      expect(rosterWasRead()).toBe(false);
      expect(selects.join(" ")).not.toContain("phone");
    });

    it("does not read the roster for a logged-in user who has not voted", async () => {
      fixture.user = { id: "bystander-1" };
      fixture.ownVote = null;
      await expectPng(await call("http://localhost/api/og/result/z_tLCPbW?format=story"));
      expect(rosterWasRead()).toBe(false);
    });

    it("reads the roster for the creator", async () => {
      fixture.user = { id: CREATOR_ID };
      fixture.ownVote = null; // creator need not have voted
      await expectPng(await call("http://localhost/api/og/result/z_tLCPbW?format=story"));
      expect(rosterWasRead()).toBe(true);
    });

    it("reads the roster for a voter once the squabble is settled", async () => {
      fixture.user = { id: "voter-1" };
      fixture.ownVote = { side: "b" };
      await expectPng(await call("http://localhost/api/og/result/z_tLCPbW?format=story"));
      expect(rosterWasRead()).toBe(true);
    });

    it("withholds the roster from a voter while the squabble is still open", async () => {
      fixture.dispute = {
        ...DISPUTE,
        status: "open",
        expires_at: "2099-01-01T00:00:00Z",
      };
      fixture.user = { id: "voter-1" };
      fixture.ownVote = { side: "b" };
      await expectPng(await call("http://localhost/api/og/result/z_tLCPbW?format=story"));
      expect(rosterWasRead()).toBe(false);
    });
  });

  describe("voter labels are resolved by the route, not hardcoded", () => {
    // Asserting through the SHIPPED handler. Calling resolveVoterLabels()
    // directly here would pass even if the route dropped the import and went
    // back to mapping every unnamed voter to a bare "Anonymous" — the failure
    // Codex caught on the first version of this test.
    //
    // Text cannot be read back out of a PNG, so the observable property is that
    // the rendered bytes VARY with the label inputs. A route that emitted one
    // constant string for every unnamed voter would render identical images for
    // fixtures that must produce different labels.
    const storyFor = async (
      users: Array<{ display_name: string | null; phone?: string | null } | null>,
      opts: { admin?: boolean } = {},
    ) => {
      adminAvailable = opts.admin ?? false;
      fixture.voteRows = users.map((u, i) => ({
        side: i === 0 ? "a" : "b",
        created_at: `2026-03-27T00:0${i}:00Z`,
        users: u,
      }));
      const res = await call("http://localhost/api/og/result/z_tLCPbW?format=story");
      expect(res.status).toBe(200);
      return Buffer.from(await res.arrayBuffer());
    };

    const PHONE_ONLY = [{ display_name: null, phone: "+15551234567" }];

    it("renders a different image for a name, a masked phone, and Anonymous #N", async () => {
      // The masked rung only exists when the service role key is configured —
      // `phone` is revoked from anon/authenticated, so without the admin client
      // the route does not even select the column.
      const named = await storyFor([{ display_name: "pranava", phone: null }], { admin: true });
      const phoneOnly = await storyFor(PHONE_ONLY, { admin: true });
      const anon = await storyFor([{ display_name: null, phone: null }], { admin: true });

      expect(named.equals(phoneOnly)).toBe(false);
      expect(phoneOnly.equals(anon)).toBe(false);
      expect(named.equals(anon)).toBe(false);
    });

    it("reaches the masked-phone rung ONLY with the admin client", async () => {
      // The assertion Codex caught the first version faking: the same voter,
      // the only difference being whether the service role key exists. With it,
      // the label is "••• 4567"; without it the column is never selected and
      // the voter degrades to "Anonymous #N". Identical bytes here would mean
      // the privileged path does nothing.
      const withAdmin = await storyFor(PHONE_ONLY, { admin: true });
      const withoutAdmin = await storyFor(PHONE_ONLY, { admin: false });
      expect(withAdmin.equals(withoutAdmin)).toBe(false);

      // And the degraded image must equal the genuinely-anonymous one, because
      // that is precisely what the missing key costs: ~32% of live voter labels.
      const trulyAnon = await storyFor([{ display_name: null, phone: null }], { admin: false });
      expect(withoutAdmin.equals(trulyAnon)).toBe(true);
    });

    it("asks for the phone column only when the admin client is available", async () => {
      await storyFor(PHONE_ONLY, { admin: true });
      expect(selects.some((sel) => sel.includes("phone"))).toBe(true);

      selects = [];
      await storyFor(PHONE_ONLY, { admin: false });
      expect(selects.some((sel) => sel.includes("phone"))).toBe(false);
    });

    it("numbers two unnamed voters distinctly rather than repeating one label", async () => {
      // "Anonymous #1, Anonymous #2" vs a bare "Anonymous, Anonymous": the
      // stable-numbering chain makes the second voter's label depend on its
      // index, so swapping which voter has the name must change the image.
      const firstNamed = await storyFor([
        { display_name: "pranava", phone: null },
        { display_name: null, phone: null },
      ]);
      const secondNamed = await storyFor([
        { display_name: null, phone: null },
        { display_name: "pranava", phone: null },
      ]);
      expect(firstNamed.equals(secondNamed)).toBe(false);
    });

    it("control: the wide format ignores names, so those fixtures render identically", async () => {
      // Proves the differences above come from the voter-label row specifically
      // and not from some incidental byte that varies per request.
      const wideFor = async (display_name: string | null) => {
        fixture.voteRows = [
          { side: "a", created_at: "2026-03-27T00:00:00Z", users: { display_name, phone: null } },
        ];
        const res = await call("http://localhost/api/og/result/z_tLCPbW");
        return Buffer.from(await res.arrayBuffer());
      };
      expect((await wideFor("pranava")).equals(await wideFor(null))).toBe(true);
    });
  });
});
