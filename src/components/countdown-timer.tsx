"use client";

import { useEffect, useRef } from "react";
import { useCountdown } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils";

type CountdownTimerProps = {
  expiresAt: string;
  onExpire?: () => void;
};

export const CountdownTimer = ({ expiresAt, onExpire }: CountdownTimerProps) => {
  const { isExpired, formatted, minutes } = useCountdown(expiresAt);
  const expireCalled = useRef(false);

  useEffect(() => {
    if (isExpired && onExpire && !expireCalled.current) {
      expireCalled.current = true;
      onExpire();
    }
  }, [isExpired, onExpire]);

  if (isExpired) {
    return (
      <div className="text-muted-foreground text-sm font-medium">
        Voting closed
      </div>
    );
  }

  const isUrgent = minutes < 5;

  return (
    <div
      className={cn(
        "text-sm font-mono font-medium",
        isUrgent ? "text-red-500 animate-pulse" : "text-muted-foreground",
      )}
    >
      {formatted} remaining
    </div>
  );
};
