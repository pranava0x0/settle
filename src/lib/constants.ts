export const APP_NAME = "Settle";
export const APP_DESCRIPTION =
  "Got a question to settle? Drop it, send the link, and let the votes do the talking.";

export const DISPUTE_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
  EXPIRED: "expired",
} as const;

export type DisputeStatus =
  (typeof DISPUTE_STATUS)[keyof typeof DISPUTE_STATUS];

export const VOTE_SIDE = {
  A: "a",
  B: "b",
} as const;

export type VoteSide = (typeof VOTE_SIDE)[keyof typeof VOTE_SIDE];

export const TIMER_PRESETS = [
  { label: "15 minutes", value: 15 },
  { label: "1 hour", value: 60 },
  { label: "6 hours", value: 360 },
  { label: "24 hours", value: 1440 },
] as const;

export const SLUG_LENGTH = 8;

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  CREATE: "/create",
  DISPUTE: (slug: string) => `/s/${slug}`,
} as const;

export const PROTECTED_ROUTES = ["/dashboard", "/create"];
export const PUBLIC_ROUTES = ["/", "/login"];
