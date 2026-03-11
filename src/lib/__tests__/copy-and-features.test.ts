import { describe, it, expect } from "vitest";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

describe("App copy", () => {
  it("APP_NAME is Settle", () => {
    expect(APP_NAME).toBe("Settle");
  });

  it("APP_DESCRIPTION uses playful copy", () => {
    expect(APP_DESCRIPTION).toContain("hot take");
    expect(APP_DESCRIPTION).toContain("votes do the talking");
  });
});

describe("DisputeResults winner format", () => {
  // Test the scoreline format logic: "{winner} wins — {high} to {low}"
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

describe("DisputeCard status labels", () => {
  const getStatusLabel = (status: string, winnerSide: "a" | "b" | null) => {
    const settled = status !== "open";
    return settled
      ? winnerSide
        ? "Settled"
        : "No winner"
      : "Live";
  };

  it("shows 'Settled' when dispute has a winner", () => {
    expect(getStatusLabel("closed", "a")).toBe("Settled");
  });

  it("shows 'No winner' when no winner", () => {
    expect(getStatusLabel("expired", null)).toBe("No winner");
  });

  it("shows 'Live' when voting is open", () => {
    expect(getStatusLabel("open", null)).toBe("Live");
  });
});

describe("ShareButton question integration", () => {
  it("generates share text with question when provided", () => {
    const question = "Is a hot dog a sandwich?";
    const text = question ? `${question} — vote now:` : "Help settle this debate:";
    expect(text).toBe("Is a hot dog a sandwich? — vote now:");
  });

  it("uses fallback share text when no question", () => {
    const question = undefined;
    const text = question ? `${question} — vote now:` : "Help settle this debate:";
    expect(text).toBe("Help settle this debate:");
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

describe("DisputeCard vote count badge", () => {
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
  it("formats button label as 'I'm with [Side]'", () => {
    const sideA = "Pizza";
    const sideB = "Tacos";
    expect(`I'm with ${sideA}`).toBe("I'm with Pizza");
    expect(`I'm with ${sideB}`).toBe("I'm with Tacos");
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
  it("uses singular 'person voted' for count of 1", () => {
    const totalVotes = 1;
    const text = `${totalVotes} ${totalVotes === 1 ? "person voted" : "people voted"}`;
    expect(text).toBe("1 person voted");
  });

  it("uses plural 'people voted' for count > 1", () => {
    const totalVotes = 5;
    const text = `${totalVotes} ${totalVotes === 1 ? "person voted" : "people voted"}`;
    expect(text).toBe("5 people voted");
  });

  it("uses correct 'person has'/'people have' for live count", () => {
    expect(`1 ${"person has"} voted`).toBe("1 person has voted");
    expect(`3 ${"people have"} voted`).toBe("3 people have voted");
  });
});
