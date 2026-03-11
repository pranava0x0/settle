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
                ? "Voting Open"
                : dispute.status === "closed"
                  ? "Settled"
                  : "Expired"}
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
                  {totalVotes} {totalVotes === 1 ? "vote" : "votes"} so far
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
              />
            </>
          )}

          <ShareButton slug={slug} />
        </CardContent>
      </Card>
    </div>
  );
}
