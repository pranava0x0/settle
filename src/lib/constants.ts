export const APP_NAME = "Squabble";
export const APP_DESCRIPTION =
  "Got a squabble? Drop it, send the link, and let the votes do the talking.";

/**
 * Navigation + page copy. Kept here so the nav link and the page it leads to
 * can't drift apart (the nav said "My debates" while the app is called
 * Squabble and every other surface says "squabble").
 */
export const NAV_DASHBOARD_LABEL = "My Squabbles";
export const DASHBOARD_HEADING = "Your Squabbles";

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

/**
 * Bar colours for the two sides of a live tally.
 *
 * Both bars used to be `bg-blue-500`, so while voting was still open the only
 * thing telling the sides apart was the label above them — the chart carried no
 * information of its own. Blue/amber is the pairing that survives the common
 * red-green colour vision deficiencies; the labels stay in place regardless, so
 * colour is reinforcement rather than the sole channel.
 *
 * Themes override these via `[data-bar-side]` in globals.css.
 */
export const SIDE_BAR_COLORS = {
  a: "bg-blue-500",
  b: "bg-amber-500",
} as const;

export const SLUG_LENGTH = 8;

/**
 * Duration bounds. Mirrors `createSquabbleSchema.duration_minutes` — the create
 * form validates against these so the client and the server agree on the range
 * instead of the form re-typing 1 and 10080 inline.
 */
export const DURATION_LIMITS = {
  MIN_MINUTES: 1,
  MAX_MINUTES: 10080,
} as const;

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

/**
 * Theme color palettes — must match CSS variable overrides in globals.css.
 * Used as source of truth for contrast ratio tests (WCAG AA minimum 4.5:1).
 *
 * Color theory references:
 * - Ring: warm analog palette (tan/brown) with complementary red+blue accents
 * - Molten: monochromatic warm (ash→ember→lava) with analogous orange accents
 * - Impact: split-complementary cool (void→navy) with cyan+orange accents
 */
export const THEME_COLORS = {
  ring: {
    background: "#f5e6d3",
    foreground: "#1a1a1a",
    card: "#f0dcc6",
    cardForeground: "#1a1a1a",
    muted: "#e8d5be",
    mutedForeground: "#5c4a38",
  },
  molten: {
    background: "#1a1a1a",
    foreground: "#f5f0e8",
    card: "#242424",
    cardForeground: "#f5f0e8",
    muted: "#2e2e2e",
    mutedForeground: "#b8a898",
  },
  impact: {
    background: "#0a0a0f",
    foreground: "#e0e6f0",
    card: "#141428",
    cardForeground: "#e0e6f0",
    muted: "#1e1e3a",
    mutedForeground: "#8899bb",
  },
} as const;

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
