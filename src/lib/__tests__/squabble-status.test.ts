import { describe, it, expect } from "vitest";
import { resolveSquabbleStatus } from "../squabble-status";

const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString();

describe("resolveSquabbleStatus", () => {
  it("is live while open and the timer is still running", () => {
    const result = resolveSquabbleStatus({
      status: "open",
      winnerSide: null,
      expiresAt: FUTURE,
    });
    expect(result.settled).toBe(false);
    expect(result.label).toBe("Live");
  });

  it("reports decided with a winner", () => {
    const result = resolveSquabbleStatus({
      status: "closed",
      winnerSide: "a",
      expiresAt: PAST,
    });
    expect(result.settled).toBe(true);
    expect(result.label).toBe("Decided");
  });

  it("reports no winner for an expired squabble with no majority", () => {
    const result = resolveSquabbleStatus({
      status: "expired",
      winnerSide: null,
      expiresAt: PAST,
    });
    expect(result.settled).toBe(true);
    expect(result.label).toBe("No winner");
  });

  it("treats an expired-but-still-open squabble as settled", () => {
    // The row shape lazy closing guarantees will exist: the timer has run out
    // but nothing has written the outcome yet. It is over, so it must not be
    // filed as live.
    const result = resolveSquabbleStatus({
      status: "open",
      winnerSide: null,
      expiresAt: PAST,
    });
    expect(result.settled).toBe(true);
  });

  it("never claims a winner it has not been told about", () => {
    const result = resolveSquabbleStatus({
      status: "open",
      winnerSide: null,
      expiresAt: PAST,
    });
    expect(result.label).not.toBe("Decided");
  });

  it("puts the dashboard bucket and the card badge on the same branch", () => {
    // The leftover bug: the dashboard bucketed on `status === "open"` while the
    // card badged on `isExpired(expires_at)`, so an expired-open row landed
    // under "Live now" wearing a "Closed" badge. Both now read one resolver, so
    // "settled" and "label" cannot disagree for any input.
    const rows = [
      { status: "open", winnerSide: null, expiresAt: FUTURE },
      { status: "open", winnerSide: null, expiresAt: PAST },
      { status: "closed", winnerSide: "a" as const, expiresAt: PAST },
      { status: "expired", winnerSide: null, expiresAt: PAST },
    ];

    for (const row of rows) {
      const { settled, label } = resolveSquabbleStatus(row);
      // A row filed under "Live now" must be the only one allowed to say "Live",
      // and a row filed as settled must never say it.
      expect(label === "Live").toBe(!settled);
    }
  });
});
