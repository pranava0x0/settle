import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/constants";
import { isExpired } from "@/lib/utils";

type DisputeCardProps = {
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

export const DisputeCard = ({
  slug,
  question,
  sideA,
  sideB,
  status,
  winnerSide,
  expiresAt,
  userVoteSide,
  voteCount,
}: DisputeCardProps) => {
  const expired = isExpired(expiresAt);
  const settled = status !== "open";

  const statusLabel = settled
    ? winnerSide
      ? "Settled"
      : "No winner"
    : expired
      ? "Closed"
      : "Live";

  const statusVariant = settled || expired ? "secondary" : "default";

  return (
    <Link href={ROUTES.DISPUTE(slug)}>
      <Card className="transition-colors hover:border-foreground/20">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{question}</CardTitle>
            <Badge variant={statusVariant} className="shrink-0 text-xs">
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
                {voteCount} {voteCount === 1 ? "vote" : "votes"}
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
