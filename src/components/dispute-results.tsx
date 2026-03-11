import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DisputeResultsProps = {
  sideA: string;
  sideB: string;
  voteCountA: number;
  voteCountB: number;
  winnerSide: "a" | "b" | null;
  status: string;
};

export const DisputeResults = ({
  sideA,
  sideB,
  voteCountA,
  voteCountB,
  winnerSide,
  status,
}: DisputeResultsProps) => {
  const totalVotes = voteCountA + voteCountB;
  const percentA = totalVotes > 0 ? Math.round((voteCountA / totalVotes) * 100) : 0;
  const percentB = totalVotes > 0 ? Math.round((voteCountB / totalVotes) * 100) : 0;

  return (
    <div className="space-y-4">
      {status === "expired" && totalVotes === 0 && (
        <p className="text-muted-foreground text-center text-sm">
          No votes were cast
        </p>
      )}
      {status === "expired" && totalVotes > 0 && voteCountA === voteCountB && (
        <Badge variant="secondary" className="mx-auto block w-fit">
          Tie — No winner
        </Badge>
      )}
      {winnerSide && (
        <Badge className="mx-auto block w-fit">
          Winner: {winnerSide === "a" ? sideA : sideB}
        </Badge>
      )}

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className={cn(winnerSide === "a" && "font-bold")}>
              {sideA}
            </span>
            <span className="text-muted-foreground">
              {voteCountA} {voteCountA === 1 ? "vote" : "votes"} ({percentA}%)
            </span>
          </div>
          <div className="bg-muted h-3 overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                winnerSide === "a" ? "bg-green-500" : "bg-blue-500",
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
              {voteCountB} {voteCountB === 1 ? "vote" : "votes"} ({percentB}%)
            </span>
          </div>
          <div className="bg-muted h-3 overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                winnerSide === "b" ? "bg-green-500" : "bg-blue-500",
              )}
              style={{ width: `${percentB}%` }}
            />
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-center text-xs">
        {totalVotes} total {totalVotes === 1 ? "vote" : "votes"}
      </p>
    </div>
  );
};
