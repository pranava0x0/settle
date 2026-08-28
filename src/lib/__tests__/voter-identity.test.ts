import { describe, it, expect } from "vitest";
import {
  countUnreadableProfiles,
  maskPhone,
  resolveVoterLabels,
  type RawVoter,
} from "../voter-identity";

const voter = (overrides: Partial<RawVoter> = {}): RawVoter => ({
  side: "a",
  display_name: null,
  phone: null,
  voted_at: "2026-08-01T00:00:00.000Z",
  // Default to a profile that WAS readable and simply has no name — that is a
  // genuine anonymous voter. Tests that mean "the read was refused" must opt in
  // with profile_readable: false, so the two never blur together again.
  profile_readable: true,
  ...overrides,
});

describe("maskPhone", () => {
  it("shows only the last 4 digits", () => {
    expect(maskPhone("+15555551694")).toBe("••• 1694");
  });

  it("strips formatting before masking", () => {
    expect(maskPhone("(555) 555-1694")).toBe("••• 1694");
  });

  it("returns null for empty or missing input", () => {
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone(undefined)).toBeNull();
    expect(maskPhone("")).toBeNull();
  });

  it("returns null when there are fewer than 4 digits", () => {
    expect(maskPhone("123")).toBeNull();
    expect(maskPhone("--")).toBeNull();
  });

  it("never leaks digits beyond the last 4", () => {
    const masked = maskPhone("+15555551694");
    expect(masked).not.toContain("5555555");
    expect(masked).toBe("••• 1694");
  });
});

describe("resolveVoterLabels", () => {
  it("prefers display_name", () => {
    const [result] = resolveVoterLabels([
      voter({ display_name: "Pranava", phone: "+15555551694" }),
    ]);
    expect(result.label).toBe("Pranava");
  });

  it("falls back to a masked phone when there is no name", () => {
    const [result] = resolveVoterLabels([voter({ phone: "+15555551694" })]);
    expect(result.label).toBe("••• 1694");
  });

  it("falls back to an indexed anonymous label when there is neither", () => {
    const [result] = resolveVoterLabels([voter()]);
    expect(result.label).toBe("Anonymous #1");
  });

  it("never renders a bare 'Anonymous'", () => {
    const labels = resolveVoterLabels([voter(), voter(), voter()]).map(
      (v) => v.label,
    );
    expect(labels).toEqual(["Anonymous #1", "Anonymous #2", "Anonymous #3"]);
    expect(labels).not.toContain("Anonymous");
  });

  it("does not renumber other voters when someone adds a name later", () => {
    // The regression both reviewers caught: numbering off a running count of
    // unnamed voters means one person setting a display_name shifts everyone
    // after them. Position-based numbering is immune.
    const before = resolveVoterLabels([voter(), voter(), voter()]).map(
      (v) => v.label,
    );
    const after = resolveVoterLabels([
      voter({ display_name: "Pranava" }),
      voter(),
      voter(),
    ]).map((v) => v.label);

    expect(before).toEqual(["Anonymous #1", "Anonymous #2", "Anonymous #3"]);
    // Voter 1 is now named; voters 2 and 3 keep the labels they already had.
    expect(after).toEqual(["Pranava", "Anonymous #2", "Anonymous #3"]);
  });

  it("numbers by vote position, so identified voters leave gaps", () => {
    const labels = resolveVoterLabels([
      voter({ display_name: "Sam" }),
      voter({ phone: "+15555550000" }),
      voter(),
    ]).map((v) => v.label);

    // #3, not #1 — a gap is cosmetic, a reassigned label is not.
    expect(labels).toEqual(["Sam", "••• 0000", "Anonymous #3"]);
  });

  it("treats a whitespace-only name as missing", () => {
    const [result] = resolveVoterLabels([voter({ display_name: "   " })]);
    expect(result.label).toBe("Anonymous #1");
  });

  it("numbers anonymous voters across both sides by vote position", () => {
    const labels = resolveVoterLabels([
      voter({ side: "a" }),
      voter({ side: "b", display_name: "Sam" }),
      voter({ side: "b" }),
      voter({ side: "a", phone: "+15555550000" }),
      voter({ side: "a" }),
    ]).map((v) => v.label);

    expect(labels).toEqual([
      "Anonymous #1",
      "Sam",
      "Anonymous #3",
      "••• 0000",
      "Anonymous #5",
    ]);
  });

  it("preserves side and voted_at", () => {
    const [result] = resolveVoterLabels([
      voter({ side: "b", voted_at: "2026-08-02T12:00:00.000Z" }),
    ]);
    expect(result.side).toBe("b");
    expect(result.voted_at).toBe("2026-08-02T12:00:00.000Z");
  });

  it("never returns a raw phone number on the resolved voter", () => {
    const resolved = resolveVoterLabels([voter({ phone: "+15555551694" })]);
    expect(JSON.stringify(resolved)).not.toContain("+15555551694");
    expect(resolved[0]).not.toHaveProperty("phone");
  });

  it("handles an empty voter list", () => {
    expect(resolveVoterLabels([])).toEqual([]);
  });
});

describe("countUnreadableProfiles", () => {
  it("counts nothing when every profile was readable", () => {
    const voters = [voter(), voter({ display_name: "Ada" })];
    expect(countUnreadableProfiles(voters)).toBe(0);
  });

  it("does not count a readable profile that merely has no name", () => {
    expect(countUnreadableProfiles([voter({ display_name: null })])).toBe(0);
  });

  it("counts profiles the query was refused", () => {
    const voters = [
      voter({ profile_readable: false }),
      voter({ display_name: "Ada" }),
      voter({ profile_readable: false }),
    ];
    expect(countUnreadableProfiles(voters)).toBe(voters.length - 1);
  });

  it("flags the all-refused case that renders as everyone-is-anonymous", () => {
    // The exact production shape: names exist in the DB, the read is blocked,
    // and every label degrades to "Anonymous #N". The labels alone cannot tell
    // you anything is wrong — the count is the only signal.
    const voters = [
      voter({ profile_readable: false }),
      voter({ profile_readable: false }),
    ];
    const labels = resolveVoterLabels(voters).map((v) => v.label);

    expect(labels.every((l) => l.startsWith("Anonymous"))).toBe(true);
    expect(countUnreadableProfiles(voters)).toBe(voters.length);
  });
});
