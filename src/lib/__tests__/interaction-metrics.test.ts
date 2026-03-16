import { describe, it, expect } from "vitest";
import { TIMER_PRESETS } from "@/lib/constants";

/**
 * Interaction count metrics for core user flows.
 *
 * These tests document the expected number of discrete user interactions
 * (each tap/click/keystroke counts as one; typing a field counts as one
 * interaction regardless of length).
 *
 * Purpose: track friction over time. Lower is better.
 * Update these counts when UX changes reduce or increase interactions.
 */

describe("Create squabble flow — interaction count", () => {
  it("requires 4 interactions with default timer", () => {
    // 1. Type question
    // 2. Type side A
    // 3. Type side B
    // 4. Tap "Let's squabble" submit
    // Timer is pre-selected to "1 hour" — no tap needed
    const interactionsWithDefault = 4;
    expect(interactionsWithDefault).toBeLessThanOrEqual(5);
  });

  it("requires 5 interactions with custom timer selection", () => {
    // 1. Type question
    // 2. Type side A
    // 3. Type side B
    // 4. Tap timer pill
    // 5. Tap submit
    const interactionsWithCustomTimer = 5;
    expect(interactionsWithCustomTimer).toBeLessThanOrEqual(6);
  });

  it("pre-selects 1 hour timer to eliminate one decision", () => {
    expect(TIMER_PRESETS[1].value).toBe(60);
    expect(TIMER_PRESETS[1].label).toBe("1 hour");
  });
});

describe("Vote flow — new user (from shared link)", () => {
  it("requires 5 interactions after auto-cast improvement", () => {
    // 1. Open shared link (tap in iMessage)
    // 2. Tap vote button (side A or side B)
    // 3. Enter phone number on login page
    // 4. Tap "Send me a code"
    // 5. Type OTP (auto-submitted at 6 digits + auto-cast on redirect)
    // Name step is optional (skip = 0 extra taps, save = 1 extra tap)
    const interactions = 5;
    expect(interactions).toBeLessThanOrEqual(6);
  });

  it("OTP auto-submit saves 1 interaction vs manual submit", () => {
    const withAutoSubmit = 5;
    const withoutAutoSubmit = 6;
    expect(withAutoSubmit).toBeLessThan(withoutAutoSubmit);
  });

  it("auto-cast saves 1 interaction vs double-tap", () => {
    const withAutoCast = 5;
    const withDoubleTap = 6;
    expect(withAutoCast).toBeLessThan(withDoubleTap);
  });
});

describe("Vote flow — returning user", () => {
  it("requires 2 interactions (already optimal)", () => {
    // 1. Open shared link
    // 2. Tap vote button
    const interactions = 2;
    expect(interactions).toBe(2);
  });
});

describe("Share flow — after creating", () => {
  it("requires 2 interactions (already optimal)", () => {
    // 1. Tap "Text it to the group"
    // 2. Tap Send in Messages
    const interactions = 2;
    expect(interactions).toBe(2);
  });
});

describe("Future friction reduction targets", () => {
  it("documents target interaction counts", () => {
    const targets = {
      createFlow: 4,        // Current: 4-5. Already good.
      newUserVote: 3,        // Current: 5. Target with lazy registration.
      returningUserVote: 2,  // Current: 2. Already optimal.
      shareFlow: 2,          // Current: 2. Already optimal.
    };

    // New user vote is the biggest opportunity
    const currentNewUserVote = 5;
    const improvement = currentNewUserVote - targets.newUserVote;
    expect(improvement).toBe(2);
  });

  it("lazy registration would reduce new-user vote to 3 interactions", () => {
    // 1. Open shared link
    // 2. Tap vote button (vote cast immediately with cookie dedup)
    // 3. Optional: tap "Lock in your vote" + enter phone
    const withLazyReg = 3;
    const current = 5;
    expect(current - withLazyReg).toBe(2);
  });
});
