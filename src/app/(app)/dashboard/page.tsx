import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DisputeCard } from "@/components/dispute-card";
import { DisplayNamePrompt } from "@/components/display-name-prompt";
import { buttonVariants } from "@/components/ui/button-variants";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

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

  // Fetch disputes I created, with vote counts
  const { data: myDisputes } = await supabase
    .from("disputes")
    .select("*, votes(count)")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch disputes I voted on (with vote side and vote counts)
  const { data: myVotes } = await supabase
    .from("votes")
    .select("side, dispute_id, disputes(*, votes(count))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const createdDisputes = myDisputes ?? [];
  const activeDisputes = createdDisputes.filter((d) => d.status === "open");
  const settledDisputes = createdDisputes.filter((d) => d.status !== "open");

  const getVoteCount = (d: { votes?: Array<{ count: number }> }) =>
    d.votes?.[0]?.count ?? 0;

  const votedDisputes = (myVotes ?? [])
    .filter((v) => v.disputes)
    .map((v) => ({
      dispute: v.disputes as unknown as Record<string, unknown> & {
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
          New one
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Live now</h2>
        {activeDisputes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing live right now.{" "}
            <Link href={ROUTES.CREATE} className="underline">
              Start one
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {activeDisputes.map((d) => (
              <DisputeCard
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
        <h2 className="mb-3 text-lg font-semibold">Settled</h2>
        {settledDisputes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No results yet. The people haven&apos;t spoken.
          </p>
        ) : (
          <div className="space-y-3">
            {settledDisputes.map((d) => (
              <DisputeCard
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
        {votedDisputes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You haven&apos;t weighed in on anything yet.
          </p>
        ) : (
          <div className="space-y-3">
            {votedDisputes.map(({ dispute, voteSide }) => (
              <DisputeCard
                key={dispute.id as string}
                slug={dispute.slug as string}
                question={dispute.question as string}
                sideA={dispute.side_a as string}
                sideB={dispute.side_b as string}
                status={dispute.status as string}
                winnerSide={dispute.winner_side as "a" | "b" | null}
                expiresAt={dispute.expires_at as string}
                userVoteSide={voteSide}
                voteCount={getVoteCount(dispute)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
