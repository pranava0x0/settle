"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  THEME_LIST,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
} from "@/lib/constants";
import type { SquabbleTheme } from "@/lib/constants";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<SquabbleTheme>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as SquabbleTheme | null;
    if (stored && THEME_LIST.some((t) => t.id === stored)) {
      setTheme(stored);
    } else {
      setTheme(DEFAULT_THEME);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const el = document.body;
    el.classList.remove("theme-ring", "theme-molten", "theme-impact");
    if (theme !== "none") {
      el.classList.add(`theme-${theme}`);
    }

    if (theme === "none") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme, mounted]);

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-1">
      {THEME_LIST.map((t) => {
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(isActive ? "none" : t.id)}
            className={cn(
              "relative size-7 rounded-full transition-all duration-200",
              isActive
                ? `ring-2 ${t.activeRing} scale-110 shadow-md`
                : "opacity-50 hover:opacity-90 hover:scale-105",
            )}
            title={t.label}
          >
            <span
              className={cn(
                "absolute inset-0.5 rounded-full",
                t.gradient,
              )}
            />
            <span className="relative z-10 flex items-center justify-center text-xs leading-none">
              {t.emoji}
            </span>
          </button>
        );
      })}
    </div>
  );
};
