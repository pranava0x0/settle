export const APP_NAME = "Squabble";
export const APP_DESCRIPTION =
  "Got a squabble? Drop it, send the link, and let the votes do the talking.";

export const SQUABBLE_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
  EXPIRED: "expired",
} as const;

export type SquabbleStatus =
  (typeof SQUABBLE_STATUS)[keyof typeof SQUABBLE_STATUS];

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
  SQUABBLE: (slug: string) => `/s/${slug}`,
} as const;

export const PROTECTED_ROUTES = ["/dashboard", "/create"];
export const PUBLIC_ROUTES = ["/", "/login"];

export const SQUABBLE_THEMES = {
  RING: "ring",
  MOLTEN: "molten",
  IMPACT: "impact",
} as const;

export type SquabbleTheme = "none" | (typeof SQUABBLE_THEMES)[keyof typeof SQUABBLE_THEMES];

export const DEFAULT_THEME: SquabbleTheme = SQUABBLE_THEMES.RING;

export const THEME_STORAGE_KEY = "squabble-theme";

export const THEME_LIST: {
  id: SquabbleTheme;
  emoji: string;
  label: string;
  gradient: string;
  activeRing: string;
}[] = [
  {
    id: SQUABBLE_THEMES.RING,
    emoji: "\uD83E\uDD4A",
    label: "The Ring",
    gradient: "bg-gradient-to-r from-red-500 via-yellow-400 to-blue-600",
    activeRing: "ring-red-400/60",
  },
  {
    id: SQUABBLE_THEMES.MOLTEN,
    emoji: "\uD83C\uDF0B",
    label: "Molten",
    gradient: "bg-gradient-to-r from-orange-600 via-red-500 to-yellow-500",
    activeRing: "ring-orange-400/60",
  },
  {
    id: SQUABBLE_THEMES.IMPACT,
    emoji: "\u2604\uFE0F",
    label: "Impact",
    gradient: "bg-gradient-to-r from-cyan-400 via-purple-500 to-orange-500",
    activeRing: "ring-cyan-400/60",
  },
];
