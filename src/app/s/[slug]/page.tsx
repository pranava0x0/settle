import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canSeeVoterIdentities,
  countUnreadableProfiles,
  resolveVoterLabels,
  type LabeledVoter,
  type RawVoter,
} from "@/lib/voter-identity";
import { isExpired } from "@/lib/utils";
import {
  didVoterWin,
  resolveSquabbleStatus,
  STATUS_BADGE_CLASSES,
} from "@/lib/squabble-status";
import { cn } from "@/lib/utils";
import { formatVoteCount } from "@/lib/formatters";
import { closeSquabble } from "@/lib/actions/squabbles";
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
import { RematchButton } from "@/components/rematch-button";
import { ShareResultButton } from "@/components/share-result-button";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: squabble } = await supabase
    .from("disputes")
    .select("question, side_a, side_b, status")
    .eq("slug", slug)
    .single();

  if (!squabble) {
    return { title: "Not Found" };
  }

  const description = `${squabble.side_a} vs ${squabble.side_b} — cast your vote!`;
  const ogImage =
    squabble.status !== "open"
      ? { url: `/api/og/result/${slug}`, width: 1200, height: 630 }
      : undefined;

  return {
    title: `${squabble.question} | ${APP_NAME}`,
    description,
    openGraph: {
      title: squabble.question,
      description,
      siteName: APP_NAME,
      type: "website",
      ...(ogImage && { images: [ogImage] }),
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

  // Lazy close: if expired but still marked open, close it now.
  //
  // Apply the returned outcome directly. Re-selecting the same row here can be
  // served from Next.js request memoization and hand back the pre-close payload,
  // which would render a settled squabble as still open.
  if (squabble.status === "open" && isExpired(squabble.expires_at)) {
    const outcome = await closeSquabble(squabble.id);
    if (outcome) {
      squabble.status = outcome.status;
      squabble.winner_side = outcome.winner_side;
    }
  }

  // The two vote counts and the session are independent of one another, so they
  // go out together. Awaited in sequence they were three round trips stacked
  // end to end, and this page's latency is almost entirely round trips.
  const [countAResult, countBResult, userResult] = await Promise.all([
    supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("dispute_id", squabble.id)
      .eq("side", "a"),
    supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("dispute_id", squabble.id)
      .eq("side", "b"),
    supabase.auth.getUser(),
  ]);

  const voteCountA = countAResult.count;
  const voteCountB = countBResult.count;
  const user = userResult.data.user;

  const isAnonymous = user?.is_anonymous ?? false;

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

  // Auto-cast vote from anonymous sign-in redirect (removes double-tap friction)
  // Insert directly instead of calling castVote server action to avoid
  // revalidatePath during render (not allowed in Next.js 16)
  if (
    user &&
    !userVote &&
    squabble.status === "open" &&
    !isExpired(squabble.expires_at) &&
    (voteSideParam === "a" || voteSideParam === "b")
  ) {
    await supabase.from("votes").insert({
      dispute_id: squabble.id,
      user_id: user.id,
      side: voteSideParam,
    });
    redirect(`/s/${slug}`);
  }

  const expired = isExpired(squabble.expires_at);
  const isClosed = squabble.status !== "open";
  const showResults = isClosed || expired;

  // Same resolver the dashboard and the cards use, so the badge here can't say
  // "Closed" while the card for the same squabble says "No winner".
  const pageStatus = resolveSquabbleStatus({
    status: squabble.status,
    winnerSide: squabble.winner_side as "a" | "b" | null,
    expiresAt: squabble.expires_at,
  });

  // Fetch voter breakdown — creator always, other voters after close
  const isCreator = user?.id === squabble.creator_id;
  const shouldShowVoters = canSeeVoterIdentities({
    viewerId: user?.id,
    creatorId: squabble.creator_id,
    status: squabble.status,
    expiresAt: squabble.expires_at,
    viewerHasVoted: !!userVote,
  });
  let voters: LabeledVoter[] = [];
  if (shouldShowVoters) {
    // Read voters with the admin client so phone is available for the masked
    // fallback. Phone is revoked from anon/authenticated (migration 00005) and
    // is masked to its last 4 digits here — raw numbers never leave the server.
    let voterClient = supabase;
    let canReadPhone = true;
    try {
      voterClient = createAdminClient();
    } catch (adminError) {
      canReadPhone = false;
      console.error(
        "Voter breakdown: admin client unavailable, falling back to names only.",
        adminError,
      );
    }

    const { data: voteRows, error: votersError } = await voterClient
      .from("votes")
      .select(
        canReadPhone
          ? "side, created_at, users(display_name, phone)"
          : "side, created_at, users(display_name)",
      )
      .eq("dispute_id", squabble.id)
      .order("created_at", { ascending: true });

    if (votersError) {
      console.error("Voter breakdown query failed:", votersError.message);
    }

    if (voteRows) {
      const rawVoters: RawVoter[] = voteRows.map((v) => {
        const userRecord = v.users as unknown as {
          display_name: string | null;
          phone?: string | null;
        } | null;
        return {
          side: v.side as "a" | "b",
          display_name: userRecord?.display_name ?? null,
          phone: userRecord?.phone ?? null,
          voted_at: v.created_at,
          // A null embed is a refused read, not a nameless voter. Without this
          // distinction an RLS block renders as "everyone is anonymous".
          profile_readable: userRecord !== null,
        };
      });

      const unreadable = countUnreadableProfiles(rawVoters);
      if (unreadable > 0) {
        console.error(
          `Voter breakdown for ${slug}: ${unreadable}/${rawVoters.length} profile ` +
            "rows were unreadable, so those voters fall back to \"Anonymous #N\" " +
            "regardless of whether they have a name. This is a permissions " +
            "failure, not anonymity. Check that migration 00002 " +
            "(\"Authenticated users can read profiles\") is applied and that " +
            "SUPABASE_SERVICE_ROLE_KEY is set.",
        );
      }

      voters = resolveVoterLabels(rawVoters);
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
              variant={pageStatus.settled ? "secondary" : "default"}
              data-status={pageStatus.key}
              className={cn(STATUS_BADGE_CLASSES[pageStatus.key])}
            >
              {pageStatus.label}
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
                  userWon={didVoterWin(userVote, squabble.winner_side as "a" | "b" | null)}
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
                  {formatVoteCount(totalVotes)} so far
                </p>
              ) : null}
              <VoteButtons
                squabbleId={squabble.id}
                sideA={squabble.side_a}
                sideB={squabble.side_b}
                userVote={userVote}
                isExpired={expired}
                isLoggedIn={!!user}
                isAnonymous={isAnonymous}
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

          {showResults ? (
            <ShareResultButton slug={slug} />
          ) : (
            <ShareButton slug={slug} question={squabble.question} />
          )}

          {showResults && isCreator && (
            <RematchButton slug={slug} />
          )}

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
