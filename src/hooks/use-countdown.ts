"use client";

import { useState, useEffect } from "react";

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

  const formatted =
    hours > 0
      ? `${hours}h ${minutes}m ${seconds}s`
      : minutes > 0
        ? `${minutes}m ${seconds}s`
        : `${seconds}s`;

  return { timeRemaining, isExpired, hours, minutes, seconds, formatted };
}
