"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import {
  THEME_LIST,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
} from "@/lib/constants";
import type { SquabbleTheme } from "@/lib/constants";

const THEME_CLASSES = THEME_LIST.map((t) => `theme-${t.id}`);

/**
 * localStorage is an external store, so it is read with useSyncExternalStore
 * rather than "render nothing, then setState in an effect".
 *
 * The effect version tripped react-hooks/set-state-in-effect (it forces a second
 * render pass on every mount) and silently broke cross-tab sync: two tabs open,
 * change the theme in one, and the other kept the old skin until reload.
 * Subscribing to `storage` fixes that as a side effect of doing it properly.
 */
// `storage` only fires in OTHER tabs, so same-tab clicks need their own signal.
const THEME_CHANGE_EVENT = "squabble-theme-change";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
};

const readStoredTheme = (): string | null => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Private mode / blocked site data. Fall back to the default rather than
    // taking the header down with it.
    return null;
  }
};

// Server render has no localStorage. Returning null keeps the markup identical
// on both sides of hydration, which is what the old `mounted` flag was for.
const readServerTheme = (): string | null => null;

export const ThemeToggle = () => {
  const stored = useSyncExternalStore(subscribe, readStoredTheme, readServerTheme);

  const isKnownTheme = (value: string | null): value is SquabbleTheme =>
    THEME_LIST.some((t) => t.id === value);

  const theme: SquabbleTheme = isKnownTheme(stored)
    ? stored
    : stored === "none"
      ? "none"
      : DEFAULT_THEME;

  const applyTheme = useCallback((next: SquabbleTheme) => {
    document.body.classList.remove(...THEME_CLASSES);
    if (next !== "none") {
      document.body.classList.add(`theme-${next}`);
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the theme still applies for this page view.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  // Syncing <body> is a DOM side effect, so it belongs in an effect — doing it
  // during render mutated the server-rendered markup before hydration finished
  // and React reported a className mismatch on <body>. This effect sets no
  // state, so it does not reintroduce the cascading-render lint error that the
  // useSyncExternalStore rewrite removed.
  useEffect(() => {
    const expected = theme === "none" ? null : `theme-${theme}`;
    document.body.classList.remove(...THEME_CLASSES);
    if (expected) document.body.classList.add(expected);
  }, [theme]);

  return (
    <div role="group" aria-label="Squabble theme" className="flex items-center gap-1">
      {THEME_LIST.map((t) => {
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => applyTheme(isActive ? "none" : t.id)}
            // The visible content is a gradient swatch and an emoji, neither of
            // which is an accessible name. Without these the toggle announces
            // as three unlabelled buttons; `title` is not a reliable substitute.
            aria-label={
              isActive ? `${t.label} theme, active. Turn off` : `${t.label} theme`
            }
            aria-pressed={isActive}
            className={cn(
              "relative flex size-7 items-center justify-center rounded-full transition-all duration-200",
              // Coarse pointers need a 44px target; the swatch stays 28px and
              // the hit area is padded out around it.
              "before:absolute before:left-1/2 before:top-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? `ring-2 ${t.activeRing} scale-110 shadow-md`
                : "opacity-50 hover:opacity-90 hover:scale-105",
            )}
          >
            <span
              aria-hidden="true"
              className={cn("absolute inset-0.5 rounded-full", t.gradient)}
            />
            <span
              aria-hidden="true"
              className="relative z-10 flex items-center justify-center text-xs leading-none"
            >
              {t.emoji}
            </span>
          </button>
        );
      })}
    </div>
  );
};
