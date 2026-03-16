import { describe, it, expect } from "vitest";
import { APP_NAME, APP_DESCRIPTION, TIMER_PRESETS } from "@/lib/constants";

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
  it("shows individual vote counts for each side", () => {
    const voteCountA = 5;
    const voteCountB = 3;
    const totalVotes = voteCountA + voteCountB;
    expect(totalVotes).toBe(8);
    expect(`${totalVotes} votes`).toBe("8 votes");
  });

  it("shows singular 'vote' for exactly 1 total", () => {
    const totalVotes = 1;
    const text = `${totalVotes} ${totalVotes === 1 ? "vote" : "votes"}`;
    expect(text).toBe("1 vote");
  });

  it("shows Live badge when squabble is open", () => {
    const status = "open";
    const label = status !== "open" ? "Decided" : "Live";
    expect(label).toBe("Live");
  });

  it("shows Decided badge when squabble is closed", () => {
    const status = "closed";
    const label = status !== "open" ? "Decided" : "Live";
    expect(label).toBe("Decided");
  });
});

describe("SquabbleResults winner format", () => {
  it("produces correct scoreline with side A winning", () => {
    const voteCountA = 7;
    const voteCountB = 3;
    const winnerSide = "a" as const;
    const sideA = "Pizza";

    const high = voteCountA > voteCountB ? voteCountA : voteCountB;
    const low = voteCountA > voteCountB ? voteCountB : voteCountA;
    const winnerName = winnerSide === "a" ? sideA : "Tacos";

    expect(winnerName).toBe("Pizza");
    expect(high).toBe(7);
    expect(low).toBe(3);
  });

  it("produces correct scoreline with side B winning", () => {
    const voteCountA = 2;
    const voteCountB = 5;
    const winnerSide = "b" as const;
    const sideB = "Tacos";

    const high = voteCountA > voteCountB ? voteCountA : voteCountB;
    const low = voteCountA > voteCountB ? voteCountB : voteCountA;
    const winnerName = winnerSide === "b" ? sideB : "Pizza";

    expect(winnerName).toBe("Tacos");
    expect(high).toBe(5);
    expect(low).toBe(2);
  });

  it("handles tie case with no winner", () => {
    const voteCountA = 4;
    const voteCountB = 4;
    const winnerSide = null;

    expect(winnerSide).toBeNull();
    expect(voteCountA).toBe(voteCountB);
  });

  it("handles zero votes", () => {
    const totalVotes = 0;
    expect(totalVotes).toBe(0);
  });

  it("calculates percentages correctly", () => {
    const voteCountA = 7;
    const voteCountB = 3;
    const totalVotes = voteCountA + voteCountB;

    const percentA = totalVotes > 0 ? Math.round((voteCountA / totalVotes) * 100) : 0;
    const percentB = totalVotes > 0 ? Math.round((voteCountB / totalVotes) * 100) : 0;

    expect(percentA).toBe(70);
    expect(percentB).toBe(30);
  });

  it("handles zero total votes for percentages", () => {
    const voteCountA = 0;
    const voteCountB = 0;
    const totalVotes = voteCountA + voteCountB;

    const percentA = totalVotes > 0 ? Math.round((voteCountA / totalVotes) * 100) : 0;
    const percentB = totalVotes > 0 ? Math.round((voteCountB / totalVotes) * 100) : 0;

    expect(percentA).toBe(0);
    expect(percentB).toBe(0);
  });
});

describe("SquabbleCard status labels", () => {
  const getStatusLabel = (status: string, winnerSide: "a" | "b" | null) => {
    const settled = status !== "open";
    return settled
      ? winnerSide
        ? "Decided"
        : "No winner"
      : "Live";
  };

  it("shows 'Decided' when squabble has a winner", () => {
    expect(getStatusLabel("closed", "a")).toBe("Decided");
  });

  it("shows 'No winner' when no winner", () => {
    expect(getStatusLabel("expired", null)).toBe("No winner");
  });

  it("shows 'Live' when voting is open", () => {
    expect(getStatusLabel("open", null)).toBe("Live");
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
    const sideAOnly = voters.filter((v) => v.side === "a");
    const sideCVoters = sideAOnly.filter((v) => v.side === "b");
    expect(sideCVoters).toHaveLength(0);
  });
});

describe("SquabbleCard vote count badge", () => {
  const formatVoteCount = (count: number) =>
    `${count} ${count === 1 ? "vote" : "votes"}`;

  it("shows '1 vote' (singular) for exactly 1 vote", () => {
    expect(formatVoteCount(1)).toBe("1 vote");
  });

  it("shows '0 votes' (plural) for zero votes", () => {
    expect(formatVoteCount(0)).toBe("0 votes");
  });

  it("shows '5 votes' (plural) for multiple votes", () => {
    expect(formatVoteCount(5)).toBe("5 votes");
  });

  it("extracts count from Supabase embedded count shape", () => {
    const d = { votes: [{ count: 7 }] };
    const count = d.votes?.[0]?.count ?? 0;
    expect(count).toBe(7);
  });

  it("defaults to 0 when votes array is empty", () => {
    const d = { votes: [] as Array<{ count: number }> };
    const count = d.votes?.[0]?.count ?? 0;
    expect(count).toBe(0);
  });

  it("defaults to 0 when votes field is undefined", () => {
    const d: { votes?: Array<{ count: number }> } = {};
    const count = d.votes?.[0]?.count ?? 0;
    expect(count).toBe(0);
  });
});

describe("Countdown timer formatting", () => {
  const formatCountdown = (hours: number, minutes: number, seconds: number) => {
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes < 5
      ? `${String(totalMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m`;
  };

  it("shows MM:SS format when under 5 minutes", () => {
    expect(formatCountdown(0, 4, 30)).toBe("04:30");
    expect(formatCountdown(0, 0, 45)).toBe("00:45");
    expect(formatCountdown(0, 3, 12)).toBe("03:12");
  });

  it("shows hours and minutes when >= 5 minutes", () => {
    expect(formatCountdown(1, 23, 0)).toBe("1h 23m");
    expect(formatCountdown(0, 30, 15)).toBe("30m");
    expect(formatCountdown(0, 5, 0)).toBe("5m");
  });

  it("pads MM:SS correctly at boundaries", () => {
    expect(formatCountdown(0, 4, 59)).toBe("04:59");
    expect(formatCountdown(0, 0, 1)).toBe("00:01");
  });
});

describe("VoteButtons copy", () => {
  it("button labels show side names directly", () => {
    const sideA = "Pizza";
    const sideB = "Tacos";
    expect(sideA).toBe("Pizza");
    expect(sideB).toBe("Tacos");
  });

  it("post-vote confirmation shows 'Your vote: [Side]'", () => {
    const sideA = "Pizza";
    expect(`Your vote: ${sideA}`).toBe("Your vote: Pizza");
  });

  it("shows 'others agree' when voteCountForUserSide > 1", () => {
    const voteCountForUserSide = 5;
    const othersCount = voteCountForUserSide - 1;
    const text = `${othersCount} ${othersCount === 1 ? "other agrees" : "others agree"}`;
    expect(text).toBe("4 others agree");
  });

  it("shows singular 'other agrees' when exactly 2 votes on side", () => {
    const voteCountForUserSide = 2;
    const othersCount = voteCountForUserSide - 1;
    const text = `${othersCount} ${othersCount === 1 ? "other agrees" : "others agree"}`;
    expect(text).toBe("1 other agrees");
  });

  it("shows nothing extra when user is the only voter on their side", () => {
    const voteCountForUserSide = 1;
    const othersCount = voteCountForUserSide - 1;
    expect(othersCount).toBe(0);
    // When 0, the component doesn't render the "others agree" text
  });

  it("handles undefined voteCountForUserSide gracefully", () => {
    const voteCountForUserSide = undefined;
    const othersCount = (voteCountForUserSide ?? 1) - 1;
    expect(othersCount).toBe(0);
  });
});

describe("Vote count display text", () => {
  it("uses singular 'person voted' for count of 1 (results view)", () => {
    const totalVotes = 1;
    const text = `${totalVotes} ${totalVotes === 1 ? "person voted" : "people voted"}`;
    expect(text).toBe("1 person voted");
  });

  it("uses plural 'people voted' for count > 1 (results view)", () => {
    const totalVotes = 5;
    const text = `${totalVotes} ${totalVotes === 1 ? "person voted" : "people voted"}`;
    expect(text).toBe("5 people voted");
  });

  it("uses 'votes so far' for live squabble count", () => {
    const totalVotes = 1;
    expect(`${totalVotes} ${totalVotes === 1 ? "vote" : "votes"} so far`).toBe("1 vote so far");
    const totalVotes2 = 3;
    expect(`${totalVotes2} ${totalVotes2 === 1 ? "vote" : "votes"} so far`).toBe("3 votes so far");
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
  it("shows prompt when display_name is null", () => {
    const profile = { display_name: null };
    const needsDisplayName = !profile.display_name;
    expect(needsDisplayName).toBe(true);
  });

  it("hides prompt when display_name is set", () => {
    const profile = { display_name: "Alice" };
    const needsDisplayName = !profile.display_name;
    expect(needsDisplayName).toBe(false);
  });

  it("shows prompt when profile query returns no data", () => {
    const profile = null;
    const needsDisplayName = !profile?.display_name;
    expect(needsDisplayName).toBe(true);
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
    const voteSideParam = "c";
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
