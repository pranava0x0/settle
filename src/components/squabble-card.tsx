import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/constants";
import {
  resolveSquabbleStatus,
  STATUS_BADGE_CLASSES,
} from "@/lib/squabble-status";
import { formatVoteCount } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type SquabbleCardProps = {
  slug: string;
  question: string;
  sideA: string;
  sideB: string;
  status: string;
  winnerSide: "a" | "b" | null;
  expiresAt: string;
  userVoteSide?: "a" | "b" | null;
  voteCount?: number;
};

export const SquabbleCard = ({
  slug,
  question,
  sideA,
  sideB,
  status,
  winnerSide,
  expiresAt,
  userVoteSide,
  voteCount,
}: SquabbleCardProps) => {
  // Same resolver the dashboard buckets with — badge and bucket cannot disagree.
  const { key: statusKey, label: statusLabel, settled } = resolveSquabbleStatus({
    status,
    winnerSide,
    expiresAt,
  });

  const statusVariant = settled ? "secondary" : "default";

  return (
    <Link href={ROUTES.SQUABBLE(slug)}>
      <Card className="transition-colors hover:border-foreground/20">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{question}</CardTitle>
            <Badge
              variant={statusVariant}
              data-status={statusKey}
              className={cn("shrink-0 text-xs", STATUS_BADGE_CLASSES[statusKey])}
            >
              {statusLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span>{sideA}</span>
            <span>vs</span>
            <span>{sideB}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            {winnerSide && (
              <p className="text-sm font-medium">
                {winnerSide === "a" ? sideA : sideB} wins
              </p>
            )}
            {voteCount !== undefined && (
              <p className="text-muted-foreground text-xs">
                {formatVoteCount(voteCount)}
              </p>
            )}
          </div>
          {userVoteSide && (
            <p className="text-muted-foreground mt-1 text-xs">
              Your vote: {userVoteSide === "a" ? sideA : sideB}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
