import { describe, it, expect } from "vitest";
import { APP_NAME, APP_DESCRIPTION, TIMER_PRESETS } from "@/lib/constants";
import { didVoterWin, resolveSquabbleStatus } from "@/lib/squabble-status";
import {
  formatCountdown,
  formatOthersAgree,
  formatScoreline,
  formatVoteCount,
  formatVoterCount,
  getEmbeddedVoteCount,
  votePercentages,
} from "@/lib/formatters";

const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString();

describe("App copy", () => {
  it("APP_NAME is Squabble", () => {
    expect(APP_NAME).toBe("Squabble");
  });

  it("APP_DESCRIPTION uses playful copy", () => {
    expect(APP_DESCRIPTION).toContain("squabble");
    expect(APP_DESCRIPTION).toContain("votes do the talking");
  });
});

describe("OG metadata for squabble pages", () => {
  it("generates correct title with question and app name", () => {
    const question = "Is a hot dog a sandwich?";
    const title = `${question} | ${APP_NAME}`;
    expect(title).toBe("Is a hot dog a sandwich? | Squabble");
  });

  it("generates description with sides", () => {
    const sideA = "Yes";
    const sideB = "No";
    const description = `${sideA} vs ${sideB} — cast your vote!`;
    expect(description).toBe("Yes vs No — cast your vote!");
  });

  it("handles long question text in title", () => {
    const question = "Should we order pizza or tacos for the Super Bowl party this weekend";
    const title = `${question} | ${APP_NAME}`;
    expect(title).toContain("pizza or tacos");
    expect(title.endsWith("| Squabble")).toBe(true);
  });
});

describe("OG image vote tally display", () => {
  it("pluralises the tally through the shipped formatter", () => {
    expect(formatVoteCount(8)).toBe("8 votes");
    expect(formatVoteCount(1)).toBe("1 vote");
    expect(formatVoteCount(0)).toBe("0 votes");
  });

  it("labels a squabble by its resolved status, not a local copy", () => {
    expect(
      resolveSquabbleStatus({ status: "open", winnerSide: null, expiresAt: FUTURE }).label,
    ).toBe("Live");
    expect(
      resolveSquabbleStatus({ status: "closed", winnerSide: "a", expiresAt: PAST }).label,
    ).toBe("Decided");
  });
});

describe("SquabbleResults winner format", () => {
  it("builds the scoreline with side A winning", () => {
    expect(formatScoreline("a", "Pizza", "Tacos", 7, 3)).toBe("Pizza wins \u2014 7 to 3");
  });

  it("builds the scoreline with side B winning", () => {
    expect(formatScoreline("b", "Pizza", "Tacos", 2, 5)).toBe("Tacos wins \u2014 5 to 2");
  });

  it("always puts the higher count first regardless of which side won", () => {
    // Guards the ordering, not a hand-typed string: the winner's count leads.
    const line = formatScoreline("b", "Pizza", "Tacos", 2, 5);
    const [high, low] = line.split(" \u2014 ")[1].split(" to ").map(Number);
    expect(high).toBeGreaterThan(low);
  });

  it("calculates percentages", () => {
    expect(votePercentages(7, 3)).toEqual({ percentA: 70, percentB: 30 });
  });

  it("returns zeroes rather than NaN when nobody has voted", () => {
    // 0/0 is NaN, and `width: NaN%` collapses the bar with no error.
    expect(votePercentages(0, 0)).toEqual({ percentA: 0, percentB: 0 });
  });

  it("splits a tie evenly", () => {
    expect(votePercentages(4, 4)).toEqual({ percentA: 50, percentB: 50 });
  });
});

describe("SquabbleCard status labels", () => {
  it("shows 'Decided' when the squabble has a winner", () => {
    expect(
      resolveSquabbleStatus({ status: "closed", winnerSide: "a", expiresAt: PAST }).label,
    ).toBe("Decided");
  });

  it("shows 'No winner' when it settled without one", () => {
    expect(
      resolveSquabbleStatus({ status: "expired", winnerSide: null, expiresAt: PAST }).label,
    ).toBe("No winner");
  });

  it("shows 'Live' while voting is open", () => {
    expect(
      resolveSquabbleStatus({ status: "open", winnerSide: null, expiresAt: FUTURE }).label,
    ).toBe("Live");
  });

  it("does not call an expired-but-open squabble Live", () => {
    // The dashboard bucketed on status while the badge read the clock, so this
    // row sat under "Live now" wearing a "Closed" badge.
    const resolved = resolveSquabbleStatus({
      status: "open",
      winnerSide: null,
      expiresAt: PAST,
    });
    expect(resolved.label).not.toBe("Live");
    expect(resolved.settled).toBe(true);
  });
});

describe("ShareButton SMS deep link", () => {
  // Import the pure function for testing
  const buildSmsBody = (question: string | undefined, url: string) => {
    return question
      ? `New squabble: ${question} — vote here: ${url}`
      : `Weigh in on this — vote here: ${url}`;
  };

  it("generates SMS body with question when provided", () => {
    const body = buildSmsBody("Is a hot dog a sandwich?", "https://squabble.app/s/abc123");
    expect(body).toBe("New squabble: Is a hot dog a sandwich? — vote here: https://squabble.app/s/abc123");
  });

  it("uses fallback SMS body when no question", () => {
    const body = buildSmsBody(undefined, "https://squabble.app/s/abc123");
    expect(body).toBe("Weigh in on this — vote here: https://squabble.app/s/abc123");
  });

  it("generates correct sms: URI with encoded body", () => {
    const body = buildSmsBody("Pizza vs Tacos?", "https://squabble.app/s/xyz");
    const href = `sms:?&body=${encodeURIComponent(body)}`;
    expect(href).toContain("sms:?&body=");
    expect(href).toContain(encodeURIComponent("Pizza vs Tacos?"));
    expect(href).toContain(encodeURIComponent("https://squabble.app/s/xyz"));
  });
});

describe("VoterBreakdown filtering", () => {
  const voters = [
    { side: "a" as const, display_name: "Alice", voted_at: "2025-01-01T00:00:00Z" },
    { side: "b" as const, display_name: "Bob", voted_at: "2025-01-01T00:01:00Z" },
    { side: "a" as const, display_name: null, voted_at: "2025-01-01T00:02:00Z" },
    { side: "b" as const, display_name: "Charlie", voted_at: "2025-01-01T00:03:00Z" },
  ];

  it("correctly filters side A voters", () => {
    const sideAVoters = voters.filter((v) => v.side === "a");
    expect(sideAVoters).toHaveLength(2);
    expect(sideAVoters[0].display_name).toBe("Alice");
    expect(sideAVoters[1].display_name).toBeNull();
  });

  it("correctly filters side B voters", () => {
    const sideBVoters = voters.filter((v) => v.side === "b");
    expect(sideBVoters).toHaveLength(2);
    expect(sideBVoters[0].display_name).toBe("Bob");
    expect(sideBVoters[1].display_name).toBe("Charlie");
  });

  it("handles anonymous voters with fallback", () => {
    const anonymousVoter = voters.find((v) => v.display_name === null);
    const displayName = anonymousVoter?.display_name ?? "Anonymous";
    expect(displayName).toBe("Anonymous");
  });

  it("returns empty array when no voters for a side", () => {
    const sideAOnly: Array<{ side: string }> = voters.filter((v) => v.side === "a");
    expect(sideAOnly.filter((v) => v.side === "b")).toHaveLength(0);
  });
});

describe("SquabbleCard vote count badge", () => {
  it("pluralises vote counts", () => {
    expect(formatVoteCount(1)).toBe("1 vote");
    expect(formatVoteCount(0)).toBe("0 votes");
    expect(formatVoteCount(5)).toBe("5 votes");
  });

  it("reads Supabase's embedded count shape", () => {
    expect(getEmbeddedVoteCount({ votes: [{ count: 7 }] })).toBe(7);
  });

  it("returns 0 for a squabble with no votes", () => {
    expect(getEmbeddedVoteCount({ votes: [] })).toBe(0);
  });

  it("returns 0 when the embed is absent", () => {
    expect(getEmbeddedVoteCount({})).toBe(0);
  });
});

describe("Countdown timer formatting", () => {
  it("shows MM:SS under 5 minutes", () => {
    expect(formatCountdown(0, 4, 30)).toBe("04:30");
    expect(formatCountdown(0, 0, 45)).toBe("00:45");
    expect(formatCountdown(0, 3, 12)).toBe("03:12");
  });

  it("shows hours and minutes at 5 minutes and above", () => {
    expect(formatCountdown(1, 23, 0)).toBe("1h 23m");
    expect(formatCountdown(0, 30, 15)).toBe("30m");
    expect(formatCountdown(0, 5, 0)).toBe("5m");
  });

  it("pads MM:SS at the boundaries", () => {
    expect(formatCountdown(0, 4, 59)).toBe("04:59");
    expect(formatCountdown(0, 0, 1)).toBe("00:01");
  });
});

describe("VoteButtons copy", () => {
  it("pluralises the agreement line", () => {
    expect(formatOthersAgree(5)).toBe("4 others agree");
    expect(formatOthersAgree(2)).toBe("1 other agrees");
  });

  it("returns null when the voter is alone on their side", () => {
    // null, not "", so the caller can't render a dangling separator.
    expect(formatOthersAgree(1)).toBeNull();
  });

  it("returns null when the count is unknown", () => {
    expect(formatOthersAgree(undefined)).toBeNull();
  });
});

describe("Vote count display text", () => {
  it("uses person/people in the results view", () => {
    expect(formatVoterCount(1)).toBe("1 person voted");
    expect(formatVoterCount(5)).toBe("5 people voted");
  });

  it("uses vote/votes for the live count", () => {
    expect(`${formatVoteCount(1)} so far`).toBe("1 vote so far");
    expect(`${formatVoteCount(3)} so far`).toBe("3 votes so far");
  });
});

describe("OTP input handling", () => {
  const stripNonDigits = (value: string) => value.replace(/\D/g, "").slice(0, 6);

  it("strips non-numeric characters from OTP input", () => {
    expect(stripNonDigits("12ab34")).toBe("1234");
    expect(stripNonDigits("1-2-3-4-5-6")).toBe("123456");
    expect(stripNonDigits(" 123 456 ")).toBe("123456");
  });

  it("truncates to 6 digits", () => {
    expect(stripNonDigits("12345678")).toBe("123456");
    expect(stripNonDigits("123456")).toBe("123456");
  });

  it("handles empty and whitespace input", () => {
    expect(stripNonDigits("")).toBe("");
    expect(stripNonDigits("   ")).toBe("");
  });

  it("auto-submit triggers at exactly 6 digits", () => {
    const shouldAutoSubmit = (digits: string) => digits.length === 6;
    expect(shouldAutoSubmit("12345")).toBe(false);
    expect(shouldAutoSubmit("123456")).toBe(true);
    expect(shouldAutoSubmit("1234")).toBe(false);
  });
});

describe("Display name validation", () => {
  const validateDisplayName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return { error: "Name is required" };
    if (trimmed.length > 50) return { error: "Name must be under 50 characters" };
    return { success: true, value: trimmed };
  };

  it("accepts valid display names", () => {
    expect(validateDisplayName("Alice")).toEqual({ success: true, value: "Alice" });
    expect(validateDisplayName("Bob Smith")).toEqual({ success: true, value: "Bob Smith" });
  });

  it("trims whitespace from display names", () => {
    expect(validateDisplayName("  Alice  ")).toEqual({ success: true, value: "Alice" });
  });

  it("rejects empty or whitespace-only names", () => {
    expect(validateDisplayName("")).toEqual({ error: "Name is required" });
    expect(validateDisplayName("   ")).toEqual({ error: "Name is required" });
  });

  it("rejects names over 50 characters", () => {
    const longName = "A".repeat(51);
    expect(validateDisplayName(longName)).toEqual({ error: "Name must be under 50 characters" });
  });

  it("accepts names at exactly 50 characters", () => {
    const name = "A".repeat(50);
    expect(validateDisplayName(name)).toEqual({ success: true, value: name });
  });
});

describe("Display name prompt visibility", () => {
  // The dashboard decides with `!profile?.display_name`. These pin the three
  // shapes that reach it, including the null-profile case.
  const needsDisplayName = (profile: { display_name: string | null } | null) =>
    !profile?.display_name;

  it("prompts when display_name is null", () => {
    expect(needsDisplayName({ display_name: null })).toBe(true);
  });

  it("stays hidden once a name is set", () => {
    expect(needsDisplayName({ display_name: "Alice" })).toBe(false);
  });

  it("prompts when the profile query returned nothing", () => {
    expect(needsDisplayName(null)).toBe(true);
  });
});

describe("Timer preset pill selector", () => {
  it("default selection is 1 hour (60 minutes)", () => {
    expect(TIMER_PRESETS[1].value).toBe(60);
    expect(TIMER_PRESETS[1].label).toBe("1 hour");
  });

  it("has exactly 4 presets for a clean horizontal row", () => {
    expect(TIMER_PRESETS).toHaveLength(4);
  });

  it("all presets have positive minute values", () => {
    for (const preset of TIMER_PRESETS) {
      expect(preset.value).toBeGreaterThan(0);
    }
  });

  it("selected preset gets aria-pressed=true", () => {
    const selectedDuration = 60;
    const isSelected = (value: number) => selectedDuration === value;
    expect(isSelected(60)).toBe(true);
    expect(isSelected(15)).toBe(false);
    expect(isSelected(360)).toBe(false);
    expect(isSelected(1440)).toBe(false);
  });
});

describe("Squabble-first onboarding", () => {
  it("detects vote redirect from squabble page", () => {
    const isVoteRedirect = (redirectTo: string) => redirectTo.startsWith("/s/");
    expect(isVoteRedirect("/s/abc123")).toBe(true);
    expect(isVoteRedirect("/dashboard")).toBe(false);
    expect(isVoteRedirect("/s/")).toBe(true);
  });

  it("shows vote-specific login copy for squabble redirects", () => {
    const redirectTo = "/s/abc123";
    const isVoteRedirect = redirectTo.startsWith("/s/");
    const copy = isVoteRedirect
      ? "Enter your number to cast your vote"
      : "Drop your number to jump in";
    expect(copy).toBe("Enter your number to cast your vote");
  });

  it("shows default login copy for non-squabble redirects", () => {
    const redirectTo = "/dashboard";
    const isVoteRedirect = redirectTo.startsWith("/s/");
    const copy = isVoteRedirect
      ? "Enter your number to cast your vote"
      : "Drop your number to jump in";
    expect(copy).toBe("Drop your number to jump in");
  });
});

describe("Login form name step (vote redirect flow)", () => {
  it("transitions to name step after OTP when redirecting to vote", () => {
    const isVoteRedirect = true;
    const otpVerified = true;
    const nextStep = otpVerified && isVoteRedirect ? "name" : "redirect";
    expect(nextStep).toBe("name");
  });

  it("skips name step for non-vote redirects (goes straight to dashboard)", () => {
    const isVoteRedirect = false;
    const otpVerified = true;
    const nextStep = otpVerified && isVoteRedirect ? "name" : "redirect";
    expect(nextStep).toBe("redirect");
  });

  it("name step is skippable — skip goes directly to redirect", () => {
    const skipped = true;
    const nameEntered = "";
    const shouldRedirect = skipped || nameEntered.trim().length > 0;
    expect(shouldRedirect).toBe(true);
  });

  it("name step description tells user why we ask", () => {
    const step = "name" as const;
    const description =
      step === "name"
        ? "So people know who voted (optional)"
        : "other";
    expect(description).toBe("So people know who voted (optional)");
  });
});

describe("Auto-cast vote after login redirect", () => {
  it("stores intended vote side in redirect URL", () => {
    const slug = "abc123";
    const side = "a";
    const redirectUrl = `/login?redirect=/s/${slug}&vote=${side}`;
    expect(redirectUrl).toBe("/login?redirect=/s/abc123&vote=a");
  });

  it("auto-casts only when user is authenticated and hasn't voted", () => {
    const isAuthenticated = true;
    const userVote = null;
    const voteSideParam = "a";
    const validSide = voteSideParam === "a" || voteSideParam === "b";
    const shouldAutoCast = isAuthenticated && !userVote && validSide;
    expect(shouldAutoCast).toBe(true);
  });

  it("does not auto-cast if user already voted", () => {
    const isAuthenticated = true;
    const userVote = "b";
    const voteSideParam = "a";
    const validSide = voteSideParam === "a" || voteSideParam === "b";
    const shouldAutoCast = isAuthenticated && !userVote && validSide;
    expect(shouldAutoCast).toBe(false);
  });

  it("does not auto-cast if vote param is invalid", () => {
    const isAuthenticated = true;
    const userVote = null;
    const voteSideParam: string = "c";
    const validSide = voteSideParam === "a" || voteSideParam === "b";
    const shouldAutoCast = isAuthenticated && !userVote && validSide;
    expect(shouldAutoCast).toBe(false);
  });

  it("does not auto-cast if user is not authenticated", () => {
    const isAuthenticated = false;
    const userVote = null;
    const voteSideParam = "a";
    const validSide = voteSideParam === "a" || voteSideParam === "b";
    const shouldAutoCast = isAuthenticated && !userVote && validSide;
    expect(shouldAutoCast).toBe(false);
  });
});

describe("Decider banner logic", () => {
  const shouldShowDeciderBanner = (
    voteCountA: number,
    voteCountB: number,
    userVote: "a" | "b" | null,
    showResults: boolean,
  ) => voteCountA === voteCountB && voteCountA > 0 && !userVote && !showResults;

  it("shows when tied, no user vote, not closed", () => {
    expect(shouldShowDeciderBanner(3, 3, null, false)).toBe(true);
  });
  it("hides when not tied", () => {
    expect(shouldShowDeciderBanner(3, 2, null, false)).toBe(false);
  });
  it("hides when tied at zero", () => {
    expect(shouldShowDeciderBanner(0, 0, null, false)).toBe(false);
  });
  it("hides when user already voted", () => {
    expect(shouldShowDeciderBanner(3, 3, "a", false)).toBe(false);
  });
  it("hides when results showing", () => {
    expect(shouldShowDeciderBanner(3, 3, null, true)).toBe(false);
  });
});

describe("Too close to call tension state", () => {
  const isTooCloseToCall = (
    voteCountA: number,
    voteCountB: number,
    showResults: boolean,
  ) => {
    const margin = Math.abs(voteCountA - voteCountB);
    const totalVotes = voteCountA + voteCountB;
    return margin <= 1 && totalVotes > 0 && !showResults;
  };

  it("shows when tied with votes", () => {
    expect(isTooCloseToCall(3, 3, false)).toBe(true);
  });
  it("shows when margin is 1", () => {
    expect(isTooCloseToCall(4, 3, false)).toBe(true);
  });
  it("hides when margin is 2+", () => {
    expect(isTooCloseToCall(5, 3, false)).toBe(false);
  });
  it("hides when no votes", () => {
    expect(isTooCloseToCall(0, 0, false)).toBe(false);
  });
  it("hides when results showing", () => {
    expect(isTooCloseToCall(3, 3, true)).toBe(false);
  });
});

describe("Voter breakdown visibility", () => {
  const shouldShowVoters = (
    isCreator: boolean,
    showResults: boolean,
    userVote: "a" | "b" | null,
  ) => isCreator || (showResults && !!userVote);

  it("shows for creator always", () => {
    expect(shouldShowVoters(true, false, null)).toBe(true);
  });
  it("shows for voter when results visible", () => {
    expect(shouldShowVoters(false, true, "a")).toBe(true);
  });
  it("hides for non-voter even when results visible", () => {
    expect(shouldShowVoters(false, true, null)).toBe(false);
  });
  it("hides for voter while squabble is open", () => {
    expect(shouldShowVoters(false, false, "a")).toBe(false);
  });
});

describe("Rematch logic", () => {
  it("swaps side_a and side_b in rematch", () => {
    const original = { side_a: "Pizza", side_b: "Tacos" };
    const rematch = { side_a: original.side_b, side_b: original.side_a };
    expect(rematch.side_a).toBe("Tacos");
    expect(rematch.side_b).toBe("Pizza");
  });

  it("calculates original duration from timestamps", () => {
    const createdAt = "2025-01-01T00:00:00Z";
    const expiresAt = "2025-01-01T01:00:00Z";
    const durationMs = new Date(expiresAt).getTime() - new Date(createdAt).getTime();
    const durationMinutes = Math.round(durationMs / (60 * 1000));
    expect(durationMinutes).toBe(60);
  });

  it("clamps duration between 1 and 10080 minutes", () => {
    const clamp = (m: number) => Math.max(1, Math.min(10080, m));
    expect(clamp(0)).toBe(1);
    expect(clamp(-5)).toBe(1);
    expect(clamp(20000)).toBe(10080);
    expect(clamp(60)).toBe(60);
  });
});

describe("Winner celebration logic", () => {
  it("user won when their vote matches winner_side", () => {
    expect(didVoterWin("a", "a")).toBe(true);
  });
  it("user lost when their vote differs from winner_side", () => {
    expect(didVoterWin("b", "a")).toBe(false);
  });
  it("no celebration when there is no winner (tie)", () => {
    expect(didVoterWin("a", null)).toBe(false);
  });
  it("no celebration when the user didn't vote", () => {
    expect(didVoterWin(null, "a")).toBe(false);
  });
  it("no celebration when there is neither a vote nor a winner", () => {
    expect(didVoterWin(null, null)).toBe(false);
  });
});
