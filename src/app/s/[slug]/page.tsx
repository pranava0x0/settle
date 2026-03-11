import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isExpired } from "@/lib/utils";
import { closeDispute } from "@/lib/actions/disputes";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/countdown-timer";
import { VoteButtons } from "@/components/vote-buttons";
import { DisputeResults } from "@/components/dispute-results";
import { ShareButton } from "@/components/share-button";
import { RealtimeVoteListener } from "@/components/realtime-vote-listener";
import { VoterBreakdown } from "@/components/voter-breakdown";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function DisputePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch dispute
  const { data: dispute, error } = await supabase
    .from("disputes")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !dispute) {
    notFound();
  }

  // Lazy close: if expired but still marked open, close it now
  if (dispute.status === "open" && isExpired(dispute.expires_at)) {
    await closeDispute(dispute.id);
    // Re-fetch to get updated status
    const { data: updated } = await supabase
      .from("disputes")
      .select("*")
      .eq("slug", slug)
      .single();
    if (updated) {
      Object.assign(dispute, updated);
    }
  }

  // Get vote counts
  const { count: voteCountA } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", dispute.id)
    .eq("side", "a");

  const { count: voteCountB } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("dispute_id", dispute.id)
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
      .eq("dispute_id", dispute.id)
      .eq("user_id", user.id)
      .single();
    if (vote) {
      userVote = vote.side as "a" | "b";
    }
  }

  // Fetch voter breakdown for creator only
  const isCreator = user?.id === dispute.creator_id;
  let voters: { side: "a" | "b"; display_name: string | null; voted_at: string }[] = [];
  if (isCreator) {
    const { data: voteRows } = await supabase
      .from("votes")
      .select("side, created_at, users(display_name)")
      .eq("dispute_id", dispute.id)
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

  const expired = isExpired(dispute.expires_at);
  const isClosed = dispute.status !== "open";
  const showResults = isClosed || expired;
  const totalVotes = (voteCountA ?? 0) + (voteCountB ?? 0);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Badge
              variant={
                dispute.status === "open" ? "default" : "secondary"
              }
            >
              {dispute.status === "open"
                ? "Live"
                : dispute.status === "closed"
                  ? "Settled"
                  : "Closed"}
            </Badge>
            {!isClosed && !expired && (
              <CountdownTimer expiresAt={dispute.expires_at} />
            )}
          </div>
          <CardTitle className="text-xl">{dispute.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {showResults ? (
            <DisputeResults
              sideA={dispute.side_a}
              sideB={dispute.side_b}
              voteCountA={voteCountA ?? 0}
              voteCountB={voteCountB ?? 0}
              winnerSide={dispute.winner_side as "a" | "b" | null}
              status={dispute.status}
            />
          ) : (
            <>
              {totalVotes > 0 && (
                <p className="text-muted-foreground text-center text-sm">
                  {totalVotes} {totalVotes === 1 ? "person has" : "people have"} voted
                </p>
              )}
              <VoteButtons
                disputeId={dispute.id}
                sideA={dispute.side_a}
                sideB={dispute.side_b}
                userVote={userVote}
                isExpired={expired}
                isLoggedIn={!!user}
                slug={slug}
                voteCountForUserSide={
                  userVote === "a" ? (voteCountA ?? 0)
                  : userVote === "b" ? (voteCountB ?? 0)
                  : undefined
                }
              />
            </>
          )}

          <ShareButton slug={slug} question={dispute.question} />

          {isCreator && voters.length > 0 && (
            <VoterBreakdown
              voters={voters}
              sideA={dispute.side_a}
              sideB={dispute.side_b}
            />
          )}

          {!isClosed && !expired && (
            <RealtimeVoteListener disputeId={dispute.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
