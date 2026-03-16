import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SquabbleCard } from "@/components/squabble-card";
import { DisplayNamePrompt } from "@/components/display-name-prompt";
import { buttonVariants } from "@/components/ui/button-variants";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { isExpired } from "@/lib/utils";
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
    .select("display_name")
    .eq("id", user.id)
    .single();

  const needsDisplayName = !profile?.display_name;

  // Fetch squabbles I created, with vote counts
  const { data: mySquabbles } = await supabase
    .from("disputes")
    .select("*, votes(count)")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch squabbles I voted on (with vote side and vote counts)
  const { data: myVotes } = await supabase
    .from("votes")
    .select("side, dispute_id, disputes(*, votes(count))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Lazy close: close any open squabbles whose timer has expired
  let createdSquabbles = mySquabbles ?? [];
  const expiredOpen = createdSquabbles.filter(
    (d) => d.status === "open" && isExpired(d.expires_at),
  );
  if (expiredOpen.length > 0) {
    await Promise.all(expiredOpen.map((d) => closeSquabble(d.id)));
    // Re-fetch to get updated statuses
    const { data: refreshed } = await supabase
      .from("disputes")
      .select("*, votes(count)")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });
    createdSquabbles = refreshed ?? createdSquabbles;
  }

  const activeSquabbles = createdSquabbles.filter((d) => d.status === "open");
  const settledSquabbles = createdSquabbles.filter((d) => d.status !== "open");

  const getVoteCount = (d: { votes?: Array<{ count: number }> }) =>
    d.votes?.[0]?.count ?? 0;

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

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your debates</h1>
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
                voteCount={getVoteCount(d)}
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
                voteCount={getVoteCount(d)}
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
                voteCount={getVoteCount(squabble)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
