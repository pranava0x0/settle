"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { castVote } from "@/lib/actions/votes";
import { useRouter } from "next/navigation";

type VoteButtonsProps = {
  disputeId: string;
  sideA: string;
  sideB: string;
  userVote?: "a" | "b" | null;
  isExpired: boolean;
  isLoggedIn: boolean;
  slug: string;
  voteCountForUserSide?: number;
};

export const VoteButtons = ({
  disputeId,
  sideA,
  sideB,
  userVote,
  isExpired,
  isLoggedIn,
  slug,
  voteCountForUserSide,
}: VoteButtonsProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVote = async (side: "a" | "b") => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/s/${slug}`);
      return;
    }

    setError("");
    setLoading(true);

    const result = await castVote({ dispute_id: disputeId, side });
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  };

  if (isExpired) {
    return null;
  }

  if (userVote) {
    const othersCount = (voteCountForUserSide ?? 1) - 1;
    return (
      <p className="text-muted-foreground text-center text-sm">
        Your vote:{" "}
        <span className="font-semibold">
          {userVote === "a" ? sideA : sideB}
        </span>
        {othersCount > 0 && (
          <> · {othersCount} {othersCount === 1 ? "other agrees" : "others agree"}</>
        )}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-auto min-h-[3rem] whitespace-normal py-3"
          onClick={() => handleVote("a")}
          disabled={loading}
        >
          {sideA}
        </Button>
        <Button
          variant="outline"
          className="h-auto min-h-[3rem] whitespace-normal py-3"
          onClick={() => handleVote("b")}
          disabled={loading}
        >
          {sideB}
        </Button>
      </div>
      {!isLoggedIn && (
        <p className="text-muted-foreground text-center text-xs">
          Tap a side to vote
        </p>
      )}
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </div>
  );
};
