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
 * Resolve every voter to a display label. Anonymous numbering is positional,
 * so it stays stable for a given squabble as long as votes are passed in
 * created_at order (votes are immutable, so the order never changes).
 */
export const resolveVoterLabels = (voters: RawVoter[]): LabeledVoter[] => {
  let anonymousCount = 0;

  return voters.map((voter) => {
    const name = voter.display_name?.trim();
    if (name) {
      return { side: voter.side, label: name, voted_at: voter.voted_at };
    }

    const masked = maskPhone(voter.phone);
    if (masked) {
      return { side: voter.side, label: masked, voted_at: voter.voted_at };
    }

    anonymousCount += 1;
    return {
      side: voter.side,
      label: `Anonymous #${anonymousCount}`,
      voted_at: voter.voted_at,
    };
  });
};
