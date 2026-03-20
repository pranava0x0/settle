"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { castVote } from "@/lib/actions/votes";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PostVotePrompt } from "@/components/post-vote-prompt";

type VoteButtonsProps = {
  squabbleId: string;
  sideA: string;
  sideB: string;
  userVote?: "a" | "b" | null;
  isExpired: boolean;
  isLoggedIn: boolean;
  isAnonymous: boolean;
  slug: string;
  voteCountForUserSide?: number;
  voteCountA: number;
  voteCountB: number;
};

export const VoteButtons = ({
  squabbleId,
  sideA,
  sideB,
  userVote,
  isExpired,
  isLoggedIn,
  isAnonymous,
  slug,
  voteCountForUserSide,
  voteCountA,
  voteCountB,
}: VoteButtonsProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [votedSide, setVotedSide] = useState<"a" | "b" | null>(null);
  const [showIdentityPrompt, setShowIdentityPrompt] = useState(false);

  const handleVote = async (side: "a" | "b") => {
    setError("");
    setLoading(true);

    // If not logged in at all, try anonymous sign-in then redirect with vote param
    // so the server-side auto-cast logic handles it (avoids cookie sync race condition)
    if (!isLoggedIn) {
      const supabase = createClient();
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        console.error("Anonymous sign-in error:", anonError.message);
        setError(`Anonymous sign-in failed: ${anonError.message}`);
        setLoading(false);
        return;
      }
      // Hard navigation to ensure fresh cookies are sent with the request
      // (router.push does soft navigation which may not sync cookies to server)
      window.location.href = `/s/${slug}?vote=${side}`;
      return;
    }

    try {
      const result = await castVote({ squabble_id: squabbleId, side });
      setLoading(false);

      if (result.error) {
        setError(result.error);
      } else {
        navigator.vibrate?.(50);
        setVotedSide(side);
        router.refresh();
      }
    } catch {
      setLoading(false);
      setError("Failed to cast vote. Please try again.");
    }
  };

  if (isExpired) {
    return null;
  }

  // Show post-vote identity prompt for anonymous voters
  if (showIdentityPrompt) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-center text-sm">
          Vote recorded for{" "}
          <span className="font-semibold">
            {votedSide === "a" ? sideA : sideB}
          </span>
        </p>
        <PostVotePrompt
          onDone={() => {
            setShowIdentityPrompt(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  if (userVote) {
    const othersCount = (voteCountForUserSide ?? 1) - 1;
    const totalVotes = voteCountA + voteCountB;
    const percentA = totalVotes > 0 ? Math.round((voteCountA / totalVotes) * 100) : 0;
    const percentB = totalVotes > 0 ? Math.round((voteCountB / totalVotes) * 100) : 0;

    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-center text-sm">
          Your vote:{" "}
          <span className="font-semibold">
            {userVote === "a" ? sideA : sideB}
          </span>
          {othersCount > 0 && (
            <> &middot; {othersCount} {othersCount === 1 ? "other agrees" : "others agree"}</>
          )}
        </p>
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className={cn(userVote === "a" && "font-semibold")}>{sideA}</span>
              <span className="text-muted-foreground">{voteCountA} ({percentA}%)</span>
            </div>
            <div className="bg-muted h-2.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-blue-500 animate-bar-fill"
                style={{ "--bar-width": `${percentA}%` } as React.CSSProperties}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className={cn(userVote === "b" && "font-semibold")}>{sideB}</span>
              <span className="text-muted-foreground">{voteCountB} ({percentB}%)</span>
            </div>
            <div className="bg-muted h-2.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-blue-500 animate-bar-fill"
                style={{ "--bar-width": `${percentB}%` } as React.CSSProperties}
              />
            </div>
          </div>
        </div>
        {isAnonymous && (
          <PostVotePrompt
            onDone={() => router.refresh()}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className={cn(
            "h-auto min-h-[3rem] whitespace-normal py-3",
            votedSide === "a" && "animate-vote-pop",
          )}
          onClick={() => handleVote("a")}
          disabled={loading}
        >
          {sideA}
        </Button>
        <Button
          variant="outline"
          className={cn(
            "h-auto min-h-[3rem] whitespace-normal py-3",
            votedSide === "b" && "animate-vote-pop",
          )}
          onClick={() => handleVote("b")}
          disabled={loading}
        >
          {sideB}
        </Button>
      </div>
      <p className="text-muted-foreground text-center text-xs">
        Tap a side to vote
      </p>
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </div>
  );
};
