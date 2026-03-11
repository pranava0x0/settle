import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { nanoid } from "nanoid";
import { SLUG_LENGTH } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(): string {
  return nanoid(SLUG_LENGTH);
}

export function formatTimeRemaining(expiresAt: string | Date): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return "Voting closed";

  const diffSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s remaining`;
  }
  return `${seconds}s remaining`;
}

export function isExpired(expiresAt: string | Date): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

export function getExpiresAt(durationMinutes: number): string {
  const expires = new Date(Date.now() + durationMinutes * 60 * 1000);
  return expires.toISOString();
}
