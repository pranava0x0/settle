/**
 * Display formatters shared by the cards, the squabble page and the OG image.
 *
 * These live here because the tests kept re-declaring them. A test that writes
 * its own `const formatVoteCount = (n) => ...` and asserts on that is testing
 * its own copy: the real component can change underneath it and the test stays
 * green. Everything in this file is imported by both the components and the
 * tests, so a change to the rendered string has exactly one place to happen.
 */

/** "1 vote" / "0 votes" / "5 votes". */
export const formatVoteCount = (count: number): string =>
  `${count} ${count === 1 ? "vote" : "votes"}`;

/** "1 person voted" / "9 people voted". */
export const formatVoterCount = (count: number): string =>
  `${count} ${count === 1 ? "person voted" : "people voted"}`;

/**
 * Pull the count out of Supabase's embedded-aggregate shape
 * (`select("*, votes(count)")` returns `votes: [{ count: n }]`).
 *
 * Returns 0 for a squabble with no votes AND for a missing field, which is safe
 * here only because both genuinely mean "no votes to show" on a card. Do not
 * copy this collapse into paths where a failed query must stay distinguishable
 * from an empty one.
 */
export const getEmbeddedVoteCount = (row: {
  votes?: Array<{ count: number }>;
}): number => row.votes?.[0]?.count ?? 0;

/**
 * Countdown label. Under 5 minutes it switches to MM:SS so the last stretch
 * reads as a clock rather than a rounded "4m".
 */
export const formatCountdown = (
  hours: number,
  minutes: number,
  seconds: number,
): string => {
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes < 5) {
    return `${String(totalMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

/**
 * Percentage split for the two sides, rounded to whole numbers.
 *
 * Guards the zero-total case explicitly: 0/0 is NaN, and `NaN%` as a CSS width
 * collapses the bar silently rather than failing.
 */
export const votePercentages = (
  voteCountA: number,
  voteCountB: number,
): { percentA: number; percentB: number } => {
  const total = voteCountA + voteCountB;
  if (total <= 0) return { percentA: 0, percentB: 0 };
  return {
    percentA: Math.round((voteCountA / total) * 100),
    percentB: Math.round((voteCountB / total) * 100),
  };
};

/**
 * "4 others agree" / "1 other agrees", or null when the voter stands alone.
 *
 * Returns null rather than an empty string so the caller has to decide what to
 * render; an empty string would quietly produce a stray separator.
 */
export const formatOthersAgree = (
  voteCountForUserSide: number | undefined,
): string | null => {
  const others = (voteCountForUserSide ?? 1) - 1;
  if (others <= 0) return null;
  return `${others} ${others === 1 ? "other agrees" : "others agree"}`;
};

/** Winner scoreline, e.g. "Pizza wins — 7 to 3". */
export const formatScoreline = (
  winnerSide: "a" | "b",
  sideA: string,
  sideB: string,
  voteCountA: number,
  voteCountB: number,
): string => {
  const high = Math.max(voteCountA, voteCountB);
  const low = Math.min(voteCountA, voteCountB);
  return `${winnerSide === "a" ? sideA : sideB} wins \u2014 ${high} to ${low}`;
};
