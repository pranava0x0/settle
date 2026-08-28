"use client";

import { useState, useEffect } from "react";
import { formatCountdown } from "@/lib/formatters";

export function useCountdown(expiresAt: string) {
  const [timeRemaining, setTimeRemaining] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  );

  const isExpired = timeRemaining <= 0;

  useEffect(() => {
    if (isExpired) return;

    const interval = setInterval(() => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeRemaining(0);
        clearInterval(interval);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isExpired]);

  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  const formatted = formatCountdown(hours, minutes, seconds);

  return { timeRemaining, isExpired, hours, minutes, seconds, formatted };
}
