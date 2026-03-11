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
}: DisputeCardProps) => {
  const expired = isExpired(expiresAt);
  const settled = status !== "open";

  const statusLabel = settled
    ? winnerSide
      ? "Settled"
      : "No Winner"
    : expired
      ? "Expired"
      : "Voting Open";

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
          {winnerSide && (
            <p className="mt-1 text-sm font-medium">
              Winner: {winnerSide === "a" ? sideA : sideB}
            </p>
          )}
          {userVoteSide && (
            <p className="text-muted-foreground mt-1 text-xs">
              You voted: {userVoteSide === "a" ? sideA : sideB}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
