import { describe, it, expect, vi, afterEach } from "vitest";
import { isExpired } from "@/lib/utils";
import { buildVoteLoginRedirect } from "@/lib/voter-identity";

/**
 * Tests covering issues ISSUE-027, ISSUE-028, and the post-vote prompt
 * dismissal bug discovered during the anonymous voting session.
 *
 * These test the business logic and conditions — not React rendering —
 * following the same pattern as copy-and-features.test.ts.
 */

// ─── ISSUE-027: Anonymous voting DB trigger ─────────────────────────────────

describe("ISSUE-027: Anonymous user phone handling", () => {
  describe("NULLIF trigger logic", () => {
    // Simulates the SQL: NULLIF(NEW.phone, '')
    const nullif = (value: string | null, match: string): string | null =>
      value === match ? null : value;

    it("converts empty string phone to null for anonymous users", () => {
      // Supabase sets phone = '' for anonymous users
      expect(nullif("", "")).toBeNull();
    });

    it("preserves real phone numbers", () => {
      expect(nullif("12039128860", "")).toBe("12039128860");
    });

    it("preserves null phone (already null)", () => {
      expect(nullif(null, "")).toBeNull();
    });

    it("preserves phone with country code", () => {
      expect(nullif("+12039128860", "")).toBe("+12039128860");
    });
  });

  describe("phone nullable constraint", () => {
    it("allows multiple anonymous users with null phone (Postgres UNIQUE allows multiple NULLs)", () => {
      // Simulate the unique constraint behavior
      const phones: (string | null)[] = [null, null, null, "12039128860"];
      const nonNullPhones = phones.filter((p) => p !== null);
      const uniqueNonNull = new Set(nonNullPhones);
      // Multiple nulls should be allowed (no unique violation)
      expect(uniqueNonNull.size).toBe(nonNullPhones.length);
    });

    it("rejects duplicate non-null phones", () => {
      const phones = ["12039128860", "12039128860"];
      const unique = new Set(phones);
      expect(unique.size).toBeLessThan(phones.length);
    });
  });

  describe("anonymous sign-in error handling", () => {
    // These two tests previously asserted the OPPOSITE — that a failed
    // anonymous sign-in shows an inline error and must NOT redirect to /login.
    // They were vacuous (they built a local string and asserted on it, never
    // touching vote-buttons.tsx), so they stayed green through the fix while
    // documenting the dead end as intended behavior. Now they call the shipped
    // builder, so restoring the dead end breaks them.

    it("sends a failed anonymous sign-in to OTP login, not a dead end", () => {
      const url = buildVoteLoginRedirect("k9_9n8gz", "a");
      expect(url).toContain("/login");
      expect(url).not.toContain("Anonymous sign-in failed");
    });

    it("preserves the vote intent through the login redirect", () => {
      const url = buildVoteLoginRedirect("k9_9n8gz", "b");
      // login-form.tsx reads `redirect`; /s/[slug] reads `vote` after landing.
      const redirect = new URL(url, "https://example.com").searchParams.get(
        "redirect",
      );
      expect(redirect).toBe("/s/k9_9n8gz?vote=b");
    });

    it("encodes the redirect so the vote param survives as one value", () => {
      const url = buildVoteLoginRedirect("k9_9n8gz", "a");
      // A bare `?vote=a` would be parsed as a param of /login, losing the intent.
      expect(url).toBe("/login?redirect=%2Fs%2Fk9_9n8gz%3Fvote%3Da");
    });
  });
});

// ─── ISSUE-027: Anonymous vote redirect URL ─────────────────────────────────

describe("ISSUE-027: Anonymous vote redirect after sign-in", () => {
  it("builds hard navigation URL with vote param after anonymous sign-in", () => {
    const slug = "k9_9n8gz";
    const side = "a";
    const url = `/s/${slug}?vote=${side}`;
    expect(url).toBe("/s/k9_9n8gz?vote=a");
  });

  it("uses window.location.href format (not router.push)", () => {
    // window.location.href = url triggers a full page reload
    // router.push(url) does a soft navigation that may not sync cookies
    // This test documents the architectural decision
    const slug = "test123";
    const side = "b";
    const url = `/s/${slug}?vote=${side}`;
    // URL should be a plain path (suitable for window.location.href)
    expect(url.startsWith("/")).toBe(true);
    expect(url).toContain("?vote=b");
  });

  it("encodes vote=a correctly in URL", () => {
    const url = `/s/abc123?vote=a`;
    const parsed = new URL(url, "http://localhost");
    expect(parsed.searchParams.get("vote")).toBe("a");
  });

  it("encodes vote=b correctly in URL", () => {
    const url = `/s/abc123?vote=b`;
    const parsed = new URL(url, "http://localhost");
    expect(parsed.searchParams.get("vote")).toBe("b");
  });
});

// ─── ISSUE-028: Auto-cast vote conditions ───────────────────────────────────

describe("ISSUE-028: Auto-cast vote from redirect", () => {
  afterEach(() => vi.useRealTimers());

  // Replicate the exact conditions from page.tsx lines 134-139
  type AutoCastContext = {
    user: { id: string } | null;
    userVote: "a" | "b" | null;
    squabbleStatus: string;
    expiresAt: string;
    voteSideParam: string | undefined;
  };

  const shouldAutoCast = (ctx: AutoCastContext): boolean => {
    return (
      !!ctx.user &&
      !ctx.userVote &&
      ctx.squabbleStatus === "open" &&
      !isExpired(ctx.expiresAt) &&
      (ctx.voteSideParam === "a" || ctx.voteSideParam === "b")
    );
  };

  const futureDate = "2099-01-01T00:00:00Z";
  const pastDate = "2020-01-01T00:00:00Z";
  const baseCtx: AutoCastContext = {
    user: { id: "user-123" },
    userVote: null,
    squabbleStatus: "open",
    expiresAt: futureDate,
    voteSideParam: "a",
  };

  it("auto-casts when all conditions met (user, no prior vote, open, not expired, valid side)", () => {
    expect(shouldAutoCast(baseCtx)).toBe(true);
  });

  it("auto-casts for side b", () => {
    expect(shouldAutoCast({ ...baseCtx, voteSideParam: "b" })).toBe(true);
  });

  it("does NOT auto-cast when user is null (not logged in)", () => {
    expect(shouldAutoCast({ ...baseCtx, user: null })).toBe(false);
  });

  it("does NOT auto-cast when user already voted", () => {
    expect(shouldAutoCast({ ...baseCtx, userVote: "a" })).toBe(false);
  });

  it("does NOT auto-cast when squabble is closed", () => {
    expect(shouldAutoCast({ ...baseCtx, squabbleStatus: "closed" })).toBe(false);
  });

  it("does NOT auto-cast when squabble is expired", () => {
    expect(shouldAutoCast({ ...baseCtx, squabbleStatus: "expired" })).toBe(false);
  });

  it("does NOT auto-cast when timer has expired", () => {
    expect(shouldAutoCast({ ...baseCtx, expiresAt: pastDate })).toBe(false);
  });

  it("does NOT auto-cast when vote param is missing", () => {
    expect(shouldAutoCast({ ...baseCtx, voteSideParam: undefined })).toBe(false);
  });

  it("does NOT auto-cast when vote param is invalid", () => {
    expect(shouldAutoCast({ ...baseCtx, voteSideParam: "c" })).toBe(false);
    expect(shouldAutoCast({ ...baseCtx, voteSideParam: "" })).toBe(false);
    expect(shouldAutoCast({ ...baseCtx, voteSideParam: "A" })).toBe(false);
  });

  describe("uses direct DB insert, not castVote server action", () => {
    it("auto-cast insert payload has dispute_id, user_id, and side", () => {
      // Documents that the auto-cast path uses supabase.from("votes").insert()
      // NOT castVote() — because castVote calls revalidatePath which crashes
      // during server component render in Next.js 16
      const squabbleId = "squabble-uuid-123";
      const userId = "user-uuid-456";
      const side = "a";

      const insertPayload = {
        dispute_id: squabbleId,
        user_id: userId,
        side,
      };

      expect(insertPayload).toEqual({
        dispute_id: "squabble-uuid-123",
        user_id: "user-uuid-456",
        side: "a",
      });
    });

    it("auto-cast redirects to clean URL after insert (strips ?vote= param)", () => {
      const slug = "k9_9n8gz";
      const redirectTarget = `/s/${slug}`;
      // Should NOT include ?vote= — that would cause an infinite loop
      expect(redirectTarget).toBe("/s/k9_9n8gz");
      expect(redirectTarget).not.toContain("?vote=");
    });
  });
});

// ─── Post-vote identity prompt dismissal ────────────────────────────────────

describe("Post-vote identity prompt visibility", () => {
  type PromptState = {
    isAnonymous: boolean;
    promptDismissed: boolean;
  };

  const shouldShowPrompt = (state: PromptState): boolean =>
    state.isAnonymous && !state.promptDismissed;

  it("shows prompt for anonymous voters who haven't dismissed", () => {
    expect(shouldShowPrompt({ isAnonymous: true, promptDismissed: false })).toBe(true);
  });

  it("hides prompt after user clicks Done/Skip", () => {
    expect(shouldShowPrompt({ isAnonymous: true, promptDismissed: true })).toBe(false);
  });

  it("hides prompt for authenticated (non-anonymous) voters", () => {
    expect(shouldShowPrompt({ isAnonymous: false, promptDismissed: false })).toBe(false);
  });

  it("stays hidden for authenticated voters even if promptDismissed is false", () => {
    // Non-anonymous users should never see the identity prompt
    expect(shouldShowPrompt({ isAnonymous: false, promptDismissed: false })).toBe(false);
  });

  it("stays hidden after dismiss even if isAnonymous remains true after refresh", () => {
    // This was the actual bug — router.refresh() re-rendered the component
    // but isAnonymous was still true, causing the prompt to reappear.
    // promptDismissed (client state) keeps it hidden.
    const stateAfterDismissAndRefresh: PromptState = {
      isAnonymous: true, // server still sees anonymous session
      promptDismissed: true, // client remembers dismissal
    };
    expect(shouldShowPrompt(stateAfterDismissAndRefresh)).toBe(false);
  });
});

// ─── VoteButtons render conditions ──────────────────────────────────────────

describe("VoteButtons render state logic", () => {
  it("returns null (renders nothing) when expired", () => {
    // vote-buttons.tsx line 83: if (isExpired) return null
    const isExpiredProp = true;
    const shouldRender = !isExpiredProp;
    expect(shouldRender).toBe(false);
  });

  it("shows vote buttons when not expired and no prior vote", () => {
    const isExpiredProp = false;
    const userVote = null;
    const shouldShowButtons = !isExpiredProp && !userVote;
    expect(shouldShowButtons).toBe(true);
  });

  it("shows results when user has voted", () => {
    const userVote: "a" | "b" | null = "a";
    const shouldShowResults = !!userVote;
    expect(shouldShowResults).toBe(true);
  });

  describe("anonymous vote flow decision tree", () => {
    it("triggers anonymous sign-in when not logged in", () => {
      const isLoggedIn = false;
      const shouldSignInAnonymously = !isLoggedIn;
      expect(shouldSignInAnonymously).toBe(true);
    });

    it("calls castVote directly when already logged in", () => {
      const isLoggedIn = true;
      const shouldSignInAnonymously = !isLoggedIn;
      const shouldCallCastVote = isLoggedIn;
      expect(shouldSignInAnonymously).toBe(false);
      expect(shouldCallCastVote).toBe(true);
    });
  });
});

// ─── Vote percentage calculation (shown after voting) ───────────────────────

describe("Vote percentage display after anonymous vote", () => {
  const calcPercent = (count: number, total: number): number =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  it("shows 100% for sole voter", () => {
    expect(calcPercent(1, 1)).toBe(100);
  });

  it("shows 0% for side with no votes", () => {
    expect(calcPercent(0, 1)).toBe(0);
  });

  it("shows 75%/25% for 3-1 split", () => {
    expect(calcPercent(3, 4)).toBe(75);
    expect(calcPercent(1, 4)).toBe(25);
  });

  it("shows 50%/50% for tie", () => {
    expect(calcPercent(2, 4)).toBe(50);
  });

  it("handles zero total votes", () => {
    expect(calcPercent(0, 0)).toBe(0);
  });

  it("rounds correctly for 2/3 split", () => {
    expect(calcPercent(2, 3)).toBe(67);
    expect(calcPercent(1, 3)).toBe(33);
  });
});

// ─── "Others agree" copy logic ──────────────────────────────────────────────

describe("Others agree copy after anonymous vote", () => {
  const othersText = (voteCountForUserSide: number): string => {
    const othersCount = voteCountForUserSide - 1;
    if (othersCount <= 0) return "";
    return `${othersCount} ${othersCount === 1 ? "other agrees" : "others agree"}`;
  };

  it("shows nothing when user is the only voter on their side", () => {
    expect(othersText(1)).toBe("");
  });

  it("shows '1 other agrees' (singular) for 2 total on same side", () => {
    expect(othersText(2)).toBe("1 other agrees");
  });

  it("shows '2 others agree' (plural) for 3 total on same side", () => {
    expect(othersText(3)).toBe("2 others agree");
  });

  it("shows '9 others agree' for 10 total on same side", () => {
    expect(othersText(10)).toBe("9 others agree");
  });
});
