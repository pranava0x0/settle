"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Voter = {
  side: "a" | "b";
  display_name: string | null;
  voted_at: string;
};

type VoterBreakdownProps = {
  voters: Voter[];
  sideA: string;
  sideB: string;
};

export const VoterBreakdown = ({
  voters,
  sideA,
  sideB,
}: VoterBreakdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (voters.length === 0) {
    return null;
  }

  const sideAVoters = voters.filter((v) => v.side === "a");
  const sideBVoters = voters.filter((v) => v.side === "b");

  return (
    <div className="border-t pt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-muted-foreground flex w-full items-center justify-center gap-1 text-xs hover:text-foreground transition-colors"
      >
        <span>See who voted</span>
        {isOpen ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {isOpen && (
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {sideA}
            </p>
            {sideAVoters.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">No one yet</p>
            ) : (
              sideAVoters.map((v, i) => (
                <p key={i} className="text-sm">
                  {v.display_name ?? "Anonymous"}
                </p>
              ))
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {sideB}
            </p>
            {sideBVoters.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">No one yet</p>
            ) : (
              sideBVoters.map((v, i) => (
                <p key={i} className="text-sm">
                  {v.display_name ?? "Anonymous"}
                </p>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
