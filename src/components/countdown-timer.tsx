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
  const { isExpired, formatted, minutes } = useCountdown(expiresAt);
  const expireCalled = useRef(false);

  useEffect(() => {
    if (isExpired && !expireCalled.current) {
      expireCalled.current = true;
      // Auto-refresh to trigger lazy close and show results
      router.refresh();
    }
  }, [isExpired, router]);

  if (isExpired) {
    return (
      <div className="text-muted-foreground text-sm font-medium">
        Time&apos;s up!
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
      {formatted} left
    </div>
  );
};
