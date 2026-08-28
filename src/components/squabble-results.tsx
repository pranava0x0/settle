import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SIDE_BAR_COLORS } from "@/lib/constants";
import {
  formatScoreline,
  formatVoteCount,
  formatVoterCount,
  votePercentages,
} from "@/lib/formatters";

type SquabbleResultsProps = {
  sideA: string;
  sideB: string;
  voteCountA: number;
  voteCountB: number;
  winnerSide: "a" | "b" | null;
  status: string;
};

export const SquabbleResults = ({
  sideA,
  sideB,
  voteCountA,
  voteCountB,
  winnerSide,
  status,
}: SquabbleResultsProps) => {
  const totalVotes = voteCountA + voteCountB;
  const { percentA, percentB } = votePercentages(voteCountA, voteCountB);

  return (
    <div className="space-y-4">
      {status === "expired" && totalVotes === 0 && (
        <p className="text-muted-foreground text-center text-sm">
          Nobody voted. Awkward.
        </p>
      )}
      {status === "expired" && totalVotes > 0 && voteCountA === voteCountB && (
        <Badge variant="secondary" className="mx-auto block w-fit">
          Dead even. No winner this time.
        </Badge>
      )}
      {winnerSide && (
        <Badge className="mx-auto block w-fit">
          {formatScoreline(winnerSide, sideA, sideB, voteCountA, voteCountB)}
        </Badge>
      )}

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className={cn(winnerSide === "a" && "font-bold")}>
              {sideA}
            </span>
            <span className="text-muted-foreground">
              {formatVoteCount(voteCountA)} ({percentA}%)
            </span>
          </div>
          <div className="bg-muted h-3 overflow-hidden rounded-full">
            <div
              data-bar-side="a"
              className={cn(
                "h-full rounded-full transition-all",
                winnerSide === "a" ? "bg-green-500" : SIDE_BAR_COLORS.a,
              )}
              style={{ width: `${percentA}%` }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className={cn(winnerSide === "b" && "font-bold")}>
              {sideB}
            </span>
            <span className="text-muted-foreground">
              {formatVoteCount(voteCountB)} ({percentB}%)
            </span>
          </div>
          <div className="bg-muted h-3 overflow-hidden rounded-full">
            <div
              data-bar-side="b"
              className={cn(
                "h-full rounded-full transition-all",
                winnerSide === "b" ? "bg-green-500" : SIDE_BAR_COLORS.b,
              )}
              style={{ width: `${percentB}%` }}
            />
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-center text-xs">
        {formatVoterCount(totalVotes)}
      </p>
    </div>
  );
};
