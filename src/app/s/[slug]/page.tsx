import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isExpired } from "@/lib/utils";
import { closeSquabble } from "@/lib/actions/squabbles";
import { castVote } from "@/lib/actions/votes";
import { APP_NAME } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/countdown-timer";
import { VoteButtons } from "@/components/vote-buttons";
import { SquabbleResults } from "@/components/squabble-results";
import { ShareButton } from "@/components/share-button";
import { RealtimeVoteListener } from "@/components/realtime-vote-listener";
import { VoterBreakdown } from "@/components/voter-breakdown";
import { WinnerCelebration } from "@/components/winner-celebration";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: squabble } = await supabase
    .from("disputes")
    .select("question, side_a, side_b")
    .eq("slug", slug)
    .single();

  if (!squabble) {
    return { title: "Not Found" };
  }

  const description = `${squabble.side_a} vs ${squabble.side_b} — cast your vote!`;

  return {
    title: `${squabble.question} | ${APP_NAME}`,
    description,
    openGraph: {
      title: squabble.question,
      description,
      siteName: APP_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: squabble.question,
      description,
    },
  };
}

export default async function SquabblePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const voteSideParam = resolvedSearchParams.vote as string | undefined;
  const supabase = await createClient();

  // Fetch squabble
  const { data: squabble, error } = await supabase
    .from("disputes")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !squabble) {
    notFound();
  }

  // Lazy close: if expired but still marked open, close it now
  if (squabble.status === "open" && isExpired(squabble.expires_at)) {
    await closeSquabble(squabble.id);
    // Re-fetch to get updated status
    const { data: updated } = await supabase
      .from("disputes")
      .select("*")
      .eq("slug", slug)
      .single();
    if (updated) {
      Object.assign(squabble, updated);
    }
  }

  // Get vote counts
  const { count: voteCountA } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", squabble.id)
    .eq("side", "a");

  const { count: voteCountB } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", squabble.id)
    .eq("side", "b");

  // Check current user's vote
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userVote: "a" | "b" | null = null;
  if (user) {
    const { data: vote } = await supabase
      .from("votes")
      .select("side")
      .eq("dispute_id", squabble.id)
      .eq("user_id", user.id)
      .single();
    if (vote) {
      userVote = vote.side as "a" | "b";
    }
  }

  // Auto-cast vote from login redirect (removes double-tap friction)
  if (
    user &&
    !userVote &&
    squabble.status === "open" &&
    !isExpired(squabble.expires_at) &&
    (voteSideParam === "a" || voteSideParam === "b")
  ) {
    await castVote({ squabble_id: squabble.id, side: voteSideParam });
    redirect(`/s/${slug}`);
  }

  const expired = isExpired(squabble.expires_at);
  const isClosed = squabble.status !== "open";
  const showResults = isClosed || expired;

  // Fetch voter breakdown — creator always, other voters after close
  const isCreator = user?.id === squabble.creator_id;
  const shouldShowVoters = isCreator || (showResults && !!userVote);
  let voters: { side: "a" | "b"; display_name: string | null; voted_at: string }[] = [];
  if (shouldShowVoters) {
    const { data: voteRows } = await supabase
      .from("votes")
      .select("side, created_at, users(display_name)")
      .eq("dispute_id", squabble.id)
      .order("created_at", { ascending: true });

    if (voteRows) {
      voters = voteRows.map((v) => {
        const userRecord = v.users as unknown as { display_name: string | null } | null;
        return {
          side: v.side as "a" | "b",
          display_name: userRecord?.display_name ?? null,
          voted_at: v.created_at,
        };
      });
    }
  }
  const totalVotes = (voteCountA ?? 0) + (voteCountB ?? 0);
  const margin = Math.abs((voteCountA ?? 0) - (voteCountB ?? 0));
  const isTied = (voteCountA ?? 0) === (voteCountB ?? 0) && (voteCountA ?? 0) > 0;
  const showDeciderBanner = isTied && !userVote && !showResults;
  const isTooCloseToCall = margin <= 1 && totalVotes > 0 && !showResults;

  return (
    <div id="squabble-page" className="squabble-page mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Badge
              variant={
                squabble.status === "open" ? "default" : "secondary"
              }
            >
              {squabble.status === "open"
                ? "Live"
                : squabble.status === "closed"
                  ? "Decided"
                  : "Closed"}
            </Badge>
            {!isClosed && !expired && (
              <CountdownTimer expiresAt={squabble.expires_at} />
            )}
          </div>
          <CardTitle className="text-xl">{squabble.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {showResults ? (
            <>
              <SquabbleResults
                sideA={squabble.side_a}
                sideB={squabble.side_b}
                voteCountA={voteCountA ?? 0}
                voteCountB={voteCountB ?? 0}
                winnerSide={squabble.winner_side as "a" | "b" | null}
                status={squabble.status}
              />
              {userVote && squabble.winner_side && (
                <WinnerCelebration
                  userWon={userVote === squabble.winner_side}
                  winnerSide={squabble.winner_side as "a" | "b"}
                  sideA={squabble.side_a}
                  sideB={squabble.side_b}
                />
              )}
            </>
          ) : (
            <>
              {showDeciderBanner && (
                <div className="rounded-lg bg-foreground px-4 py-3 text-center text-sm font-semibold text-background">
                  It&apos;s {voteCountA ?? 0}&ndash;{voteCountB ?? 0}. Your vote decides this.
                </div>
              )}
              {isTooCloseToCall && !showDeciderBanner ? (
                <p className="animate-pulse text-center text-sm font-medium text-foreground">
                  Too close to call &mdash; every vote matters
                </p>
              ) : totalVotes > 0 && !showDeciderBanner ? (
                <p className="text-muted-foreground text-center text-sm">
                  {totalVotes} {totalVotes === 1 ? "vote" : "votes"} so far
                </p>
              ) : null}
              <VoteButtons
                squabbleId={squabble.id}
                sideA={squabble.side_a}
                sideB={squabble.side_b}
                userVote={userVote}
                isExpired={expired}
                isLoggedIn={!!user}
                slug={slug}
                voteCountForUserSide={
                  userVote === "a" ? (voteCountA ?? 0)
                  : userVote === "b" ? (voteCountB ?? 0)
                  : undefined
                }
                voteCountA={voteCountA ?? 0}
                voteCountB={voteCountB ?? 0}
              />
            </>
          )}

          <ShareButton slug={slug} question={squabble.question} />

          {shouldShowVoters && voters.length > 0 && (
            <VoterBreakdown
              voters={voters}
              sideA={squabble.side_a}
              sideB={squabble.side_b}
            />
          )}

          {!isClosed && !expired && (
            <RealtimeVoteListener squabbleId={squabble.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
