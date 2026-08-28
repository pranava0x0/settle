import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SquabbleCard } from "@/components/squabble-card";
import { DisplayNamePrompt } from "@/components/display-name-prompt";
import { SmsOptOutToggle } from "@/components/sms-opt-out-toggle";
import { buttonVariants } from "@/components/ui/button-variants";
import Link from "next/link";
import { DASHBOARD_HEADING, ROUTES } from "@/lib/constants";
import { isExpired } from "@/lib/utils";
import { resolveSquabbleStatus } from "@/lib/squabble-status";
import { getEmbeddedVoteCount } from "@/lib/formatters";
import { closeSquabble } from "@/lib/actions/squabbles";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  // Check if user has set a display name
  const { data: profile } = await supabase
    .from("users")
    .select("display_name, sms_opt_out")
    .eq("id", user.id)
    .single();

  const needsDisplayName = !profile?.display_name;
  // Only accounts with a verified phone can receive result texts, so only they
  // get the switch. `is_anonymous` is the reliable signal — an anonymous
  // session never has a number on file.
  const canReceiveTexts = !user.is_anonymous;

  // Independent queries, issued together rather than one after the other.
  const [createdResult, votedResult] = await Promise.all([
    // Squabbles I created, with vote counts.
    supabase
      .from("disputes")
      .select("*, votes(count)")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false }),
    // Squabbles I voted on, with my side and the vote counts.
    supabase
      .from("votes")
      .select("side, dispute_id, disputes(*, votes(count))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const mySquabbles = createdResult.data;
  const myVotes = votedResult.data;

  // Lazy close: close any open squabbles whose timer has expired.
  //
  // Apply each outcome onto the row we already hold rather than re-selecting.
  // An identical GET inside the same render pass can be served from Next.js's
  // request memoization and hand back the pre-close payload — which is how a
  // just-closed squabble rendered under "Live now" with a "Closed" badge.
  const createdSquabbles = mySquabbles ?? [];
  const expiredOpen = createdSquabbles.filter(
    (d) => d.status === "open" && isExpired(d.expires_at),
  );
  if (expiredOpen.length > 0) {
    const outcomes = await Promise.all(
      expiredOpen.map((d) => closeSquabble(d.id)),
    );
    expiredOpen.forEach((squabble, i) => {
      const outcome = outcomes[i];
      if (outcome) {
        squabble.status = outcome.status;
        squabble.winner_side = outcome.winner_side;
      }
    });
  }

  // Bucket with the same resolver the card badges use, so a row can never be
  // filed as live while its own badge says otherwise.
  const isSettled = (d: {
    status: string;
    winner_side: string | null;
    expires_at: string;
  }) =>
    resolveSquabbleStatus({
      status: d.status,
      winnerSide: d.winner_side as "a" | "b" | null,
      expiresAt: d.expires_at,
    }).settled;

  const activeSquabbles = createdSquabbles.filter((d) => !isSettled(d));
  const settledSquabbles = createdSquabbles.filter((d) => isSettled(d));

  const votedSquabbles = (myVotes ?? [])
    .filter((v) => v.disputes)
    .map((v) => ({
      squabble: v.disputes as unknown as Record<string, unknown> & {
        votes?: Array<{ count: number }>;
      },
      voteSide: v.side as "a" | "b",
    }));

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {needsDisplayName && <DisplayNamePrompt />}
      {canReceiveTexts && (
        <div className="mb-6 rounded-lg border px-4 py-3">
          <SmsOptOutToggle optedOut={profile?.sms_opt_out ?? false} />
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{DASHBOARD_HEADING}</h1>
        <Link
          href={ROUTES.CREATE}
          className={buttonVariants({ size: "sm" })}
        >
          Squabble
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Live now</h2>
        {activeSquabbles.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing live right now.{" "}
            <Link href={ROUTES.CREATE} className="underline">
              Start one
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {activeSquabbles.map((d) => (
              <SquabbleCard
                key={d.id}
                slug={d.slug}
                question={d.question}
                sideA={d.side_a}
                sideB={d.side_b}
                status={d.status}
                winnerSide={d.winner_side as "a" | "b" | null}
                expiresAt={d.expires_at}
                voteCount={getEmbeddedVoteCount(d)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Decided</h2>
        {settledSquabbles.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No results yet. The people haven&apos;t spoken.
          </p>
        ) : (
          <div className="space-y-3">
            {settledSquabbles.map((d) => (
              <SquabbleCard
                key={d.id}
                slug={d.slug}
                question={d.question}
                sideA={d.side_a}
                sideB={d.side_b}
                status={d.status}
                winnerSide={d.winner_side as "a" | "b" | null}
                expiresAt={d.expires_at}
                voteCount={getEmbeddedVoteCount(d)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">You voted on</h2>
        {votedSquabbles.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You haven&apos;t weighed in on anything yet.
          </p>
        ) : (
          <div className="space-y-3">
            {votedSquabbles.map(({ squabble, voteSide }) => (
              <SquabbleCard
                key={squabble.id as string}
                slug={squabble.slug as string}
                question={squabble.question as string}
                sideA={squabble.side_a as string}
                sideB={squabble.side_b as string}
                status={squabble.status as string}
                winnerSide={squabble.winner_side as "a" | "b" | null}
                expiresAt={squabble.expires_at as string}
                userVoteSide={voteSide}
                voteCount={getEmbeddedVoteCount(squabble)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
