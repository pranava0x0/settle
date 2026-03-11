"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCountdown } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils";

type CountdownTimerProps = {
  expiresAt: string;
};

export const CountdownTimer = ({ expiresAt }: CountdownTimerProps) => {
  const router = useRouter();
  const { isExpired, formatted, timeRemaining } = useCountdown(expiresAt);
  const expireCalled = useRef(false);

  useEffect(() => {
    if (isExpired && !expireCalled.current) {
      expireCalled.current = true;
      router.refresh();
    }
  }, [isExpired, router]);

  if (isExpired) {
    return (
      <div className="text-muted-foreground text-sm font-medium">
        Closed
      </div>
    );
  }

  const totalMinutes = timeRemaining / (1000 * 60);
  const isUrgent = totalMinutes < 5;
  const isWarning = totalMinutes < 25 && totalMinutes >= 5;

  return (
    <div
      className={cn(
        "text-sm font-mono font-medium",
        isUrgent
          ? "text-red-500 animate-pulse"
          : isWarning
            ? "text-yellow-500"
            : "text-muted-foreground",
      )}
    >
      {isUrgent && "Closing soon \u00B7 "}
      Closes in {formatted}
    </div>
  );
};
