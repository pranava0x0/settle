/**
 * Voter identity resolution.
 *
 * The "See who voted" breakdown must never render a bare "Anonymous" for
 * everyone (see IMPROVEMENT_PLAN.md Phase 1). Labels resolve through a chain:
 *   display_name -> masked phone ("••• 1694") -> stable "Anonymous #N".
 *
 * Phone masking runs SERVER-SIDE only — raw phone numbers must never reach the
 * client. Pass raw rows in, send only the resolved labels to components.
 */

/**
 * URL a voter is sent to when anonymous sign-in is unavailable: OTP login,
 * carrying the vote intent so `/s/[slug]` auto-casts it after redirect.
 * `login-form.tsx` reads the `redirect` param; keep the key in sync with it.
 *
 * Exported so the regression test exercises the shipped builder rather than
 * re-deriving the string (a test that rebuilds the URL passes whatever the
 * component does).
 */
export const buildVoteLoginRedirect = (slug: string, side: "a" | "b"): string =>
  `/login?redirect=${encodeURIComponent(`/s/${slug}?vote=${side}`)}`;

export type RawVoter = {
  side: "a" | "b";
  display_name: string | null;
  phone: string | null;
  voted_at: string;
};

export type LabeledVoter = {
  side: "a" | "b";
  label: string;
  voted_at: string;
};

/** Last 4 digits only, e.g. "+15551234567" -> "••• 4567". Null if unusable. */
export const maskPhone = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `••• ${digits.slice(-4)}`;
};

/**
 * Resolve every voter to a display label.
 *
 * Anonymous numbering is the voter's 1-based position in the full vote list,
 * NOT a running count of unnamed voters. That distinction is the whole point:
 * votes are immutable and ordered by created_at, but `display_name` is mutable,
 * and the post-vote prompt exists to get people to set one. Counting only the
 * unnamed voters would renumber everyone else the moment one person adds a
 * name — "Anonymous #2" silently becomes "#1" because a stranger did something.
 *
 * The cost is gaps (#1, #4, #5 when voters 2 and 3 have names). A gap is
 * cosmetic; a label that reassigns itself to a different person is not.
 *
 * Callers must pass votes in created_at order for the numbering to be stable.
 */
export const resolveVoterLabels = (voters: RawVoter[]): LabeledVoter[] =>
  voters.map((voter, index) => {
    const name = voter.display_name?.trim();
    if (name) {
      return { side: voter.side, label: name, voted_at: voter.voted_at };
    }

    const masked = maskPhone(voter.phone);
    if (masked) {
      return { side: voter.side, label: masked, voted_at: voter.voted_at };
    }

    return {
      side: voter.side,
      label: `Anonymous #${index + 1}`,
      voted_at: voter.voted_at,
    };
  });
